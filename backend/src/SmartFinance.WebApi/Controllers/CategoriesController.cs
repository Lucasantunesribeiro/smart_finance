using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("ApiRateLimit")]
public class CategoriesController : ControllerBase
{
    private readonly ILogger<CategoriesController> _logger;

    public CategoriesController(ILogger<CategoriesController> logger)
    {
        _logger = logger;
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
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = userIdClaim?.Value ?? "unknown";
            
            _logger.LogInformation("Getting categories for user {UserId}", userId);
            
            // Generate realistic demo categories
            var allCategories = GetMockCategories();
            
            // Apply filters
            var filteredCategories = allCategories.AsQueryable();
            
            if (isActive.HasValue)
            {
                filteredCategories = filteredCategories.Where(c => c.isActive == isActive.Value);
            }
            
            if (type.HasValue)
            {
                filteredCategories = filteredCategories.Where(c => c.type == type.Value);
            }
            
            if (!string.IsNullOrEmpty(search))
            {
                filteredCategories = filteredCategories.Where(c => 
                    c.name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    (c.description != null && c.description.Contains(search, StringComparison.OrdinalIgnoreCase)));
            }
            
            // Apply sorting
            filteredCategories = sortBy.ToLower() switch
            {
                "name" => sortOrder.ToLower() == "desc" 
                    ? filteredCategories.OrderByDescending(c => c.name)
                    : filteredCategories.OrderBy(c => c.name),
                "type" => sortOrder.ToLower() == "desc" 
                    ? filteredCategories.OrderByDescending(c => c.type)
                    : filteredCategories.OrderBy(c => c.type),
                "createdat" => sortOrder.ToLower() == "desc" 
                    ? filteredCategories.OrderByDescending(c => c.createdAt)
                    : filteredCategories.OrderBy(c => c.createdAt),
                _ => filteredCategories.OrderBy(c => c.name)
            };
            
            var totalCount = filteredCategories.Count();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
            
            var pagedCategories = filteredCategories
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var result = new
            {
                items = pagedCategories,
                totalCount = totalCount,
                page = page,
                pageSize = pageSize,
                totalPages = totalPages
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving categories for user {UserId}", 
                User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown");
            return StatusCode(500, new { message = "An error occurred while retrieving categories" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategory(string id)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = userIdClaim?.Value ?? "unknown";
            
            _logger.LogInformation("Getting category {CategoryId} for user {UserId}", id, userId);
            
            var categories = GetMockCategories();
            var category = categories.FirstOrDefault(c => c.id == id);
            
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            return Ok(category);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving category {CategoryId} for user {UserId}", 
                id, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown");
            return StatusCode(500, new { message = "An error occurred while retrieving category" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = userIdClaim?.Value ?? "unknown";
            
            _logger.LogInformation("Creating category for user {UserId}", userId);
            
            if (string.IsNullOrWhiteSpace(request.name))
            {
                return BadRequest(new { message = "Category name is required" });
            }
            
            var newCategory = new
            {
                id = Guid.NewGuid().ToString(),
                name = request.name,
                type = request.type ?? 1, // Default to Expense
                description = request.description,
                color = request.color ?? "#3b82f6",
                icon = request.icon,
                parentId = request.parentCategoryId,
                parentName = (string?)null,
                isActive = true,
                transactionCount = 0,
                totalAmount = 0.00m,
                createdAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                updatedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
            };

            return CreatedAtAction(nameof(GetCategory), new { id = newCategory.id }, newCategory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating category for user {UserId}", 
                User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown");
            return StatusCode(500, new { message = "An error occurred while creating category" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] UpdateCategoryRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = userIdClaim?.Value ?? "unknown";
            
            _logger.LogInformation("Updating category {CategoryId} for user {UserId}", id, userId);
            
            var categories = GetMockCategories();
            var category = categories.FirstOrDefault(c => c.id == id);
            
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }
            
            // Update category (in real app, this would update database)
            var updatedCategory = new
            {
                id = category.id,
                name = request.name ?? category.name,
                type = request.type ?? category.type,
                description = request.description ?? category.description,
                color = request.color ?? category.color,
                icon = request.icon ?? category.icon,
                parentId = request.parentCategoryId ?? category.parentId,
                parentName = category.parentName,
                isActive = request.isActive ?? category.isActive,
                transactionCount = category.transactionCount,
                totalAmount = category.totalAmount,
                createdAt = category.createdAt,
                updatedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
            };

            return Ok(updatedCategory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category {CategoryId} for user {UserId}", 
                id, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown");
            return StatusCode(500, new { message = "An error occurred while updating category" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = userIdClaim?.Value ?? "unknown";
            
            _logger.LogInformation("Deleting category {CategoryId} for user {UserId}", id, userId);
            
            var categories = GetMockCategories();
            var category = categories.FirstOrDefault(c => c.id == id);
            
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }
            
            // In real app, this would soft delete or check for dependencies
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category {CategoryId} for user {UserId}", 
                id, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown");
            return StatusCode(500, new { message = "An error occurred while deleting category" });
        }
    }

    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetCategoryStats(string id)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = userIdClaim?.Value ?? "unknown";
            
            _logger.LogInformation("Getting stats for category {CategoryId} for user {UserId}", id, userId);
            
            var random = new Random();
            var stats = new
            {
                totalTransactions = random.Next(15, 50),
                totalAmount = Math.Round((decimal)(random.NextDouble() * 2000 + 500), 2),
                averageAmount = Math.Round((decimal)(random.NextDouble() * 200 + 50), 2),
                lastTransaction = DateTime.UtcNow.AddDays(-random.Next(1, 30)).ToString("yyyy-MM-ddTHH:mm:ssZ")
            };

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving stats for category {CategoryId} for user {UserId}", 
                id, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown");
            return StatusCode(500, new { message = "An error occurred while retrieving category stats" });
        }
    }

    private CategoryDto[] GetMockCategories()
    {
        // TODO: Replace with real database query to get categories
        return new CategoryDto[0]; // Empty array until real implementation
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