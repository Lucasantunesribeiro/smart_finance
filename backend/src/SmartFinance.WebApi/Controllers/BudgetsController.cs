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
public class BudgetsController : ControllerBase
{
    private readonly ILogger<BudgetsController> _logger;
    private readonly SmartFinanceDbContext _context;

    public BudgetsController(ILogger<BudgetsController> logger, SmartFinanceDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public sealed class CreateBudgetRequest
    {
        public string Name { get; set; } = string.Empty;
        public decimal Allocated { get; set; }
        public string? CategoryId { get; set; }
        public BudgetPeriod Period { get; set; } = BudgetPeriod.Monthly;
        public string? Description { get; set; }
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
    }

    public sealed class UpdateBudgetRequest
    {
        public string? Name { get; set; }
        public decimal? Allocated { get; set; }
        public string? CategoryId { get; set; }
        public BudgetPeriod? Period { get; set; }
        public string? Description { get; set; }
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public bool? IsActive { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> GetBudgets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] BudgetPeriod? period = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? categoryId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 100) pageSize = 100;

            Guid? parsedCategoryId = null;
            if (!string.IsNullOrWhiteSpace(categoryId))
            {
                if (!Guid.TryParse(categoryId, out var categoryGuid))
                {
                    return BadRequest(new { message = "Invalid category id" });
                }
                parsedCategoryId = categoryGuid;
            }

            var query = _context.Budgets
                .AsNoTracking()
                .Include(b => b.Category)
                .Where(b => b.UserId == userId && !b.IsDeleted);
            if (period.HasValue)
            {
                query = query.Where(b => b.Period == period.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(b => b.IsActive == isActive.Value);
            }

            if (parsedCategoryId.HasValue)
            {
                query = query.Where(b => b.CategoryId == parsedCategoryId.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(b => b.EndDate >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(b => b.StartDate <= toDate.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = $"%{search.Trim()}%";
                query = query.Where(b => EF.Functions.Like(b.Name, searchTerm));
            }
            query = ApplySorting(query, sortBy, sortOrder);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var rawItems = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    b.Amount,
                    b.SpentAmount,
                    b.StartDate,
                    b.EndDate,
                    b.Period,
                    b.IsActive,
                    b.CategoryId,
                    CategoryName = b.Category != null ? b.Category.Name : null,
                    b.CreatedAt,
                    b.UpdatedAt
                })
                .ToListAsync();
            var items = new List<object>();
            foreach (var item in rawItems)
            {
                var spent = await GetSpentAmount(userId, item.CategoryId, item.StartDate, item.EndDate);
                var allocated = item.Amount;
                var remaining = allocated - spent;
                var percentage = allocated > 0 ? (spent / allocated) * 100m : 0m;

                items.Add(new
                {
                    id = item.Id.ToString(),
                    name = item.Name,
                    description = (string?)null,
                    allocated,
                    spent,
                    remaining,
                    percentage = Math.Round(percentage, 2),
                    categoryId = item.CategoryId?.ToString(),
                    categoryName = item.CategoryName,
                    period = (int)item.Period,
                    startDate = item.StartDate.ToString("yyyy-MM-dd"),
                    endDate = item.EndDate.ToString("yyyy-MM-dd"),
                    isActive = item.IsActive,
                    createdAt = item.CreatedAt.ToString("o"),
                    updatedAt = item.UpdatedAt.ToString("o")
                });
            }

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
            _logger.LogError(ex, "Error retrieving budgets");
            return StatusCode(500, new { message = "An error occurred while retrieving budgets" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBudget(string id)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!Guid.TryParse(id, out var budgetId))
            {
                return BadRequest(new { message = "Invalid budget id" });
            }
            var budget = await _context.Budgets
                .AsNoTracking()
                .Include(b => b.Category)
                .FirstOrDefaultAsync(b => b.Id == budgetId && b.UserId == userId && !b.IsDeleted);

            if (budget == null)
            {
                return NotFound(new { message = "Budget not found" });
            }

            var spent = await GetSpentAmount(userId, budget.CategoryId, budget.StartDate, budget.EndDate);
            var allocated = budget.Amount;
            var remaining = allocated - spent;
            var percentage = allocated > 0 ? (spent / allocated) * 100m : 0m;

            return Ok(new
            {
                id = budget.Id.ToString(),
                name = budget.Name,
                description = (string?)null,
                allocated,
                spent,
                remaining,
                percentage = Math.Round(percentage, 2),
                categoryId = budget.CategoryId?.ToString(),
                categoryName = budget.Category?.Name,
                period = (int)budget.Period,
                startDate = budget.StartDate.ToString("yyyy-MM-dd"),
                endDate = budget.EndDate.ToString("yyyy-MM-dd"),
                isActive = budget.IsActive,
                createdAt = budget.CreatedAt.ToString("o"),
                updatedAt = budget.UpdatedAt.ToString("o")
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving budget {BudgetId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving budget" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateBudget([FromBody] CreateBudgetRequest request)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Budget name is required" });
            }

            if (request.Allocated <= 0)
            {
                return BadRequest(new { message = "Allocated amount must be greater than zero" });
            }

            if (!DateTime.TryParse(request.StartDate, out var startDate))
            {
                return BadRequest(new { message = "Invalid start date" });
            }

            if (!DateTime.TryParse(request.EndDate, out var endDate))
            {
                return BadRequest(new { message = "Invalid end date" });
            }

            if (endDate < startDate)
            {
                return BadRequest(new { message = "End date must be after start date" });
            }

            Guid? parsedCategoryId = null;
            if (!string.IsNullOrWhiteSpace(request.CategoryId))
            {
                if (!Guid.TryParse(request.CategoryId, out var categoryGuid))
                {
                    return BadRequest(new { message = "Invalid category id" });
                }
                parsedCategoryId = categoryGuid;
            }

            var budget = new Budget
            {
                Name = request.Name.Trim(),
                Amount = request.Allocated,
                SpentAmount = 0m,
                StartDate = DateTime.SpecifyKind(startDate.Date, DateTimeKind.Utc),
                EndDate = DateTime.SpecifyKind(endDate.Date, DateTimeKind.Utc),
                Period = request.Period,
                IsActive = true,
                UserId = userId,
                CategoryId = parsedCategoryId,
                CreatedBy = userId.ToString(),
                UpdatedBy = userId.ToString(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Budgets.Add(budget);
            await _context.SaveChangesAsync();

            var spent = await GetSpentAmount(userId, budget.CategoryId, budget.StartDate, budget.EndDate);
            var remaining = budget.Amount - spent;
            var percentage = budget.Amount > 0 ? (spent / budget.Amount) * 100m : 0m;

            return CreatedAtAction(nameof(GetBudget), new { id = budget.Id }, new
            {
                id = budget.Id.ToString(),
                name = budget.Name,
                description = request.Description,
                allocated = budget.Amount,
                spent,
                remaining,
                percentage = Math.Round(percentage, 2),
                categoryId = budget.CategoryId?.ToString(),
                categoryName = await _context.Categories
                    .AsNoTracking()
                    .Where(c => c.Id == budget.CategoryId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync(),
                period = (int)budget.Period,
                startDate = budget.StartDate.ToString("yyyy-MM-dd"),
                endDate = budget.EndDate.ToString("yyyy-MM-dd"),
                isActive = budget.IsActive,
                createdAt = budget.CreatedAt.ToString("o"),
                updatedAt = budget.UpdatedAt.ToString("o")
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating budget");
            return StatusCode(500, new { message = "An error occurred while creating budget" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBudget(string id, [FromBody] UpdateBudgetRequest request)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!Guid.TryParse(id, out var budgetId))
            {
                return BadRequest(new { message = "Invalid budget id" });
            }

            var budget = await _context.Budgets
                .Include(b => b.Category)
                .FirstOrDefaultAsync(b => b.Id == budgetId && b.UserId == userId && !b.IsDeleted);
            if (budget == null)
            {
                return NotFound(new { message = "Budget not found" });
            }

            if (request.Name != null)
            {
                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest(new { message = "Budget name cannot be empty" });
                }
                budget.Name = request.Name.Trim();
            }

            if (request.Allocated.HasValue)
            {
                if (request.Allocated.Value <= 0)
                {
                    return BadRequest(new { message = "Allocated amount must be greater than zero" });
                }
                budget.Amount = request.Allocated.Value;
            }

            if (request.CategoryId != null)
            {
                if (string.IsNullOrWhiteSpace(request.CategoryId))
                {
                    budget.CategoryId = null;
                }
                else if (!Guid.TryParse(request.CategoryId, out var categoryGuid))
                {
                    return BadRequest(new { message = "Invalid category id" });
                }
                else
                {
                    budget.CategoryId = categoryGuid;
                }
            }

            if (request.Period.HasValue)
            {
                budget.Period = request.Period.Value;
            }

            if (request.StartDate != null)
            {
                if (!DateTime.TryParse(request.StartDate, out var parsedStart))
                {
                    return BadRequest(new { message = "Invalid start date" });
                }
                budget.StartDate = DateTime.SpecifyKind(parsedStart.Date, DateTimeKind.Utc);
            }

            if (request.EndDate != null)
            {
                if (!DateTime.TryParse(request.EndDate, out var parsedEnd))
                {
                    return BadRequest(new { message = "Invalid end date" });
                }
                budget.EndDate = DateTime.SpecifyKind(parsedEnd.Date, DateTimeKind.Utc);
            }

            if (budget.EndDate < budget.StartDate)
            {
                return BadRequest(new { message = "End date must be after start date" });
            }

            if (request.IsActive.HasValue)
            {
                budget.IsActive = request.IsActive.Value;
            }

            budget.UpdatedAt = DateTime.UtcNow;
            budget.UpdatedBy = userId.ToString();
            await _context.SaveChangesAsync();

            var spent = await GetSpentAmount(userId, budget.CategoryId, budget.StartDate, budget.EndDate);
            var remaining = budget.Amount - spent;
            var percentage = budget.Amount > 0 ? (spent / budget.Amount) * 100m : 0m;

            return Ok(new
            {
                id = budget.Id.ToString(),
                name = budget.Name,
                description = request.Description,
                allocated = budget.Amount,
                spent,
                remaining,
                percentage = Math.Round(percentage, 2),
                categoryId = budget.CategoryId?.ToString(),
                categoryName = budget.Category?.Name,
                period = (int)budget.Period,
                startDate = budget.StartDate.ToString("yyyy-MM-dd"),
                endDate = budget.EndDate.ToString("yyyy-MM-dd"),
                isActive = budget.IsActive,
                createdAt = budget.CreatedAt.ToString("o"),
                updatedAt = budget.UpdatedAt.ToString("o")
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating budget {BudgetId}", id);
            return StatusCode(500, new { message = "An error occurred while updating budget" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBudget(string id)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!Guid.TryParse(id, out var budgetId))
            {
                return BadRequest(new { message = "Invalid budget id" });
            }
            var budget = await _context.Budgets
                .FirstOrDefaultAsync(b => b.Id == budgetId && b.UserId == userId && !b.IsDeleted);

            if (budget == null)
            {
                return NotFound(new { message = "Budget not found" });
            }

            budget.IsDeleted = true;
            budget.IsActive = false;
            budget.UpdatedAt = DateTime.UtcNow;
            budget.UpdatedBy = userId.ToString();
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting budget {BudgetId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting budget" });
        }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetBudgetSummary()
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            var budgets = await _context.Budgets
                .AsNoTracking()
                .Where(b => b.UserId == userId && !b.IsDeleted && b.IsActive)
                .ToListAsync();

            decimal totalAllocated = 0m;
            decimal totalSpent = 0m;
            int overBudgetCount = 0;

            foreach (var budget in budgets)
            {
                totalAllocated += budget.Amount;
                var spent = await GetSpentAmount(userId, budget.CategoryId, budget.StartDate, budget.EndDate);
                totalSpent += spent;
                if (budget.Amount > 0 && (spent / budget.Amount) * 100m >= 90m)
                {
                    overBudgetCount++;
                }
            }

            var totalRemaining = totalAllocated - totalSpent;
            var onTrackCount = budgets.Count - overBudgetCount;

            return Ok(new
            {
                totalBudgets = budgets.Count,
                totalAllocated,
                totalSpent,
                totalRemaining,
                overBudgetCount,
                onTrackCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving budget summary");
            return StatusCode(500, new { message = "An error occurred while retrieving budget summary" });
        }
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return !string.IsNullOrWhiteSpace(userIdValue) && Guid.TryParse(userIdValue, out userId);
    }

    private async Task<decimal> GetSpentAmount(Guid userId, Guid? categoryId, DateTime startDate, DateTime endDate)
    {
        var query = _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && !t.IsDeleted)
            .Where(t => t.TransactionDate >= startDate && t.TransactionDate <= endDate)
            .Where(t => t.Type == TransactionType.Expense);

        if (categoryId.HasValue)
        {
            query = query.Where(t => t.CategoryId == categoryId.Value);
        }

        var total = await query.SumAsync(t => (double?)(t.Amount < 0 ? -t.Amount : t.Amount)) ?? 0d;
        return Convert.ToDecimal(total);
    }

    private static IQueryable<Budget> ApplySorting(IQueryable<Budget> query, string? sortBy, string? sortOrder)
    {
        var descending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        return (sortBy ?? "name").ToLowerInvariant() switch
        {
            "amount" => descending ? query.OrderByDescending(b => b.Amount) : query.OrderBy(b => b.Amount),
            "startdate" => descending ? query.OrderByDescending(b => b.StartDate) : query.OrderBy(b => b.StartDate),
            "enddate" => descending ? query.OrderByDescending(b => b.EndDate) : query.OrderBy(b => b.EndDate),
            "createdat" => descending ? query.OrderByDescending(b => b.CreatedAt) : query.OrderBy(b => b.CreatedAt),
            "updatedat" => descending ? query.OrderByDescending(b => b.UpdatedAt) : query.OrderBy(b => b.UpdatedAt),
            _ => descending ? query.OrderByDescending(b => b.Name) : query.OrderBy(b => b.Name)
        };
    }
}
