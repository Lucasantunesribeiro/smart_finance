using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;
using System.Security.Claims;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("ApiRateLimit")]
public class CategoriesController : ControllerBase
{
    private readonly ILogger<CategoriesController> _logger;
    private readonly SmartFinanceDbContext _context;

    public CategoriesController(ILogger<CategoriesController> logger, SmartFinanceDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? isActive = null,
        [FromQuery] int? type = null,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortOrder = "asc",
        [FromQuery] string search = "")
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";
            _logger.LogInformation("Getting categories for user {UserId}", userId);

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Categories.AsNoTracking();

            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            if (type.HasValue)
            {
                query = query.Where(c => (int)c.Type == type.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = $"%{search.Trim()}%";
                query = query.Where(c =>
                    EF.Functions.Like(c.Name, searchTerm) ||
                    (c.Description != null && EF.Functions.Like(c.Description, searchTerm)));
            }

            query = ApplySorting(query, sortBy, sortOrder);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var rawItems = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Type,
                    c.Description,
                    c.Color,
                    c.Icon,
                    c.ParentId,
                    ParentName = c.Parent != null ? c.Parent.Name : null,
                    c.IsActive,
                    c.CreatedAt,
                    c.UpdatedAt
                })
                .ToListAsync();

            var categoryIds = rawItems.Select(c => c.Id).ToList();
            var transactionStats = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.CategoryId.HasValue && categoryIds.Contains(t.CategoryId.Value) && !t.IsDeleted)
                .GroupBy(t => t.CategoryId!.Value)
                .Select(g => new
                {
                    CategoryId = g.Key,
                    Count = g.Count(),
                    TotalAmount = g.Sum(t => (double)t.Amount)
                })
                .ToListAsync();

            var statsMap = transactionStats.ToDictionary(s => s.CategoryId, s => s);

            var items = rawItems.Select(c =>
            {
                statsMap.TryGetValue(c.Id, out var stats);
                return new CategoryDto
                {
                    id = c.Id.ToString(),
                    name = c.Name,
                    type = (int)c.Type,
                    description = c.Description,
                    color = c.Color,
                    icon = c.Icon,
                    parentId = c.ParentId.HasValue ? c.ParentId.Value.ToString() : null,
                    parentName = c.ParentName,
                    isActive = c.IsActive,
                    transactionCount = stats?.Count ?? 0,
                    totalAmount = stats != null ? Convert.ToDecimal(stats.TotalAmount) : 0m,
                    createdAt = c.CreatedAt.ToString("o"),
                    updatedAt = c.UpdatedAt.ToString("o")
                };
            }).ToList();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving categories for user {UserId}",
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown");
            return StatusCode(500, new { message = "An error occurred while retrieving categories" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategory(string id)
    {
        try
        {
            if (!Guid.TryParse(id, out var categoryId))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var category = await _context.Categories
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == categoryId);

            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            var transactionCount = await _context.Transactions.CountAsync(t => t.CategoryId == categoryId && !t.IsDeleted);
            var totalAmountDouble = await _context.Transactions
                .Where(t => t.CategoryId == categoryId && !t.IsDeleted)
                .SumAsync(t => (double?)t.Amount) ?? 0d;
            var totalAmount = Convert.ToDecimal(totalAmountDouble);

            return Ok(new CategoryDto
            {
                id = category.Id.ToString(),
                name = category.Name,
                type = (int)category.Type,
                description = category.Description,
                color = category.Color,
                icon = category.Icon,
                parentId = category.ParentId?.ToString(),
                parentName = null,
                isActive = category.IsActive,
                transactionCount = transactionCount,
                totalAmount = totalAmount,
                createdAt = category.CreatedAt.ToString("o"),
                updatedAt = category.UpdatedAt.ToString("o")
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving category {CategoryId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving category" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.name))
            {
                return BadRequest(new { message = "Category name is required" });
            }

            var categoryType = CategoryType.Expense;
            if (request.type.HasValue)
            {
                if (!Enum.IsDefined(typeof(CategoryType), request.type.Value))
                {
                    return BadRequest(new { message = "Invalid category type" });
                }
                categoryType = (CategoryType)request.type.Value;
            }

            Guid? parentId = null;
            if (!string.IsNullOrWhiteSpace(request.parentCategoryId))
            {
                if (!Guid.TryParse(request.parentCategoryId, out var parsedParentId))
                {
                    return BadRequest(new { message = "Invalid parent category id" });
                }
                parentId = parsedParentId;
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";

            var category = new Category
            {
                Name = request.name.Trim(),
                Type = categoryType,
                Description = string.IsNullOrWhiteSpace(request.description) ? null : request.description.Trim(),
                Color = string.IsNullOrWhiteSpace(request.color) ? "#3b82f6" : request.color.Trim(),
                Icon = request.icon,
                ParentId = parentId,
                IsActive = true,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, new CategoryDto
            {
                id = category.Id.ToString(),
                name = category.Name,
                type = (int)category.Type,
                description = category.Description,
                color = category.Color,
                icon = category.Icon,
                parentId = category.ParentId?.ToString(),
                parentName = null,
                isActive = category.IsActive,
                transactionCount = 0,
                totalAmount = 0m,
                createdAt = category.CreatedAt.ToString("o"),
                updatedAt = category.UpdatedAt.ToString("o")
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating category");
            return StatusCode(500, new { message = "An error occurred while creating category" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] UpdateCategoryRequest request)
    {
        try
        {
            if (!Guid.TryParse(id, out var categoryId))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == categoryId);
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            if (request.name != null)
            {
                if (string.IsNullOrWhiteSpace(request.name))
                {
                    return BadRequest(new { message = "Category name cannot be empty" });
                }
                category.Name = request.name.Trim();
            }

            if (request.type.HasValue)
            {
                if (!Enum.IsDefined(typeof(CategoryType), request.type.Value))
                {
                    return BadRequest(new { message = "Invalid category type" });
                }
                category.Type = (CategoryType)request.type.Value;
            }

            if (request.description != null)
            {
                category.Description = string.IsNullOrWhiteSpace(request.description) ? null : request.description.Trim();
            }

            if (request.color != null)
            {
                category.Color = string.IsNullOrWhiteSpace(request.color) ? "#3b82f6" : request.color.Trim();
            }

            if (request.icon != null)
            {
                category.Icon = request.icon;
            }

            if (request.parentCategoryId != null)
            {
                if (string.IsNullOrWhiteSpace(request.parentCategoryId))
                {
                    category.ParentId = null;
                }
                else if (!Guid.TryParse(request.parentCategoryId, out var parsedParentId))
                {
                    return BadRequest(new { message = "Invalid parent category id" });
                }
                else
                {
                    category.ParentId = parsedParentId;
                }
            }

            if (request.isActive.HasValue)
            {
                category.IsActive = request.isActive.Value;
            }

            category.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new CategoryDto
            {
                id = category.Id.ToString(),
                name = category.Name,
                type = (int)category.Type,
                description = category.Description,
                color = category.Color,
                icon = category.Icon,
                parentId = category.ParentId?.ToString(),
                parentName = null,
                isActive = category.IsActive,
                transactionCount = await _context.Transactions.CountAsync(t => t.CategoryId == category.Id && !t.IsDeleted),
                totalAmount = Convert.ToDecimal(await _context.Transactions
                    .Where(t => t.CategoryId == category.Id && !t.IsDeleted)
                    .SumAsync(t => (double?)t.Amount) ?? 0d),
                createdAt = category.CreatedAt.ToString("o"),
                updatedAt = category.UpdatedAt.ToString("o")
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category {CategoryId}", id);
            return StatusCode(500, new { message = "An error occurred while updating category" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        try
        {
            if (!Guid.TryParse(id, out var categoryId))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == categoryId);
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            category.IsDeleted = true;
            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category {CategoryId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting category" });
        }
    }

    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetCategoryStats(string id)
    {
        try
        {
            if (!Guid.TryParse(id, out var categoryId))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var transactions = _context.Transactions
                .AsNoTracking()
                .Where(t => t.CategoryId == categoryId && !t.IsDeleted);

            var totalTransactions = await transactions.CountAsync();
            var totalAmountDouble = await transactions.SumAsync(t => (double?)t.Amount) ?? 0d;
            var totalAmount = Convert.ToDecimal(totalAmountDouble);
            var averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0m;
            var lastTransactionDate = await transactions.MaxAsync(t => (DateTime?)t.TransactionDate);

            return Ok(new
            {
                totalTransactions,
                totalAmount,
                averageAmount,
                lastTransaction = lastTransactionDate?.ToString("o")
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving stats for category {CategoryId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving category stats" });
        }
    }

    private static IQueryable<Category> ApplySorting(IQueryable<Category> query, string sortBy, string sortOrder)
    {
        var descending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        return sortBy.ToLowerInvariant() switch
        {
            "type" => descending ? query.OrderByDescending(c => c.Type) : query.OrderBy(c => c.Type),
            "createdat" => descending ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt),
            "updatedat" => descending ? query.OrderByDescending(c => c.UpdatedAt) : query.OrderBy(c => c.UpdatedAt),
            _ => descending ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name)
        };
    }

    public class CreateCategoryRequest
    {
        public string name { get; set; } = string.Empty;
        public int? type { get; set; }
        public string? description { get; set; }
        public string? color { get; set; }
        public string? icon { get; set; }
        public string? parentCategoryId { get; set; }
    }

    public class UpdateCategoryRequest
    {
        public string? name { get; set; }
        public int? type { get; set; }
        public string? description { get; set; }
        public string? color { get; set; }
        public string? icon { get; set; }
        public string? parentCategoryId { get; set; }
        public bool? isActive { get; set; }
    }

    public class CategoryDto
    {
        public string id { get; set; } = string.Empty;
        public string name { get; set; } = string.Empty;
        public int type { get; set; }
        public string? description { get; set; }
        public string color { get; set; } = string.Empty;
        public string? icon { get; set; }
        public string? parentId { get; set; }
        public string? parentName { get; set; }
        public bool isActive { get; set; }
        public int transactionCount { get; set; }
        public decimal totalAmount { get; set; }
        public string createdAt { get; set; } = string.Empty;
        public string updatedAt { get; set; } = string.Empty;
    }
}
