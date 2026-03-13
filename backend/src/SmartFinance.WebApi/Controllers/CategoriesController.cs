using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Enums;
using System.Security.Claims;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("ApiRateLimit")]
public class CategoriesController : ControllerBase
{
    private readonly ILogger<CategoriesController> _logger;
    private readonly ICategoryService _categoryService;

    public CategoriesController(ILogger<CategoriesController> logger, ICategoryService categoryService)
    {
        _logger = logger;
        _categoryService = categoryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? isActive = null,
        [FromQuery] int? type = null,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortOrder = "asc",
        [FromQuery] string search = "",
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            var result = await _categoryService.GetCategoriesAsync(userId, page, pageSize, isActive, type, sortBy, sortOrder, search, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving categories");
            return StatusCode(500, new { message = "An error occurred while retrieving categories" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategory(string id, CancellationToken cancellationToken)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!Guid.TryParse(id, out var categoryId))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var category = await _categoryService.GetCategoryAsync(userId, categoryId, cancellationToken);
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            return Ok(category);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving category {CategoryId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving category" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] CategoryCreateRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Category name is required" });
            }

            if (request.Type.HasValue && !Enum.IsDefined(typeof(CategoryType), request.Type.Value))
            {
                return BadRequest(new { message = "Invalid category type" });
            }

            if (!string.IsNullOrWhiteSpace(request.ParentCategoryId) && !Guid.TryParse(request.ParentCategoryId, out _))
            {
                return BadRequest(new { message = "Invalid parent category id" });
            }

            var category = await _categoryService.CreateCategoryAsync(userId, request, cancellationToken);
            return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating category");
            return StatusCode(500, new { message = "An error occurred while creating category" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] CategoryUpdateRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!Guid.TryParse(id, out var categoryId))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            if (request.Name != null && string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Category name cannot be empty" });
            }

            if (request.Type.HasValue && !Enum.IsDefined(typeof(CategoryType), request.Type.Value))
            {
                return BadRequest(new { message = "Invalid category type" });
            }

            if (request.ParentCategoryId != null && !string.IsNullOrWhiteSpace(request.ParentCategoryId) && !Guid.TryParse(request.ParentCategoryId, out _))
            {
                return BadRequest(new { message = "Invalid parent category id" });
            }

            var category = await _categoryService.UpdateCategoryAsync(userId, categoryId, request, cancellationToken);
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            return Ok(category);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category {CategoryId}", id);
            return StatusCode(500, new { message = "An error occurred while updating category" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(string id, CancellationToken cancellationToken)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!Guid.TryParse(id, out var categoryId))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var deleted = await _categoryService.DeleteCategoryAsync(userId, categoryId, cancellationToken);
            if (!deleted)
            {
                return NotFound(new { message = "Category not found" });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category {CategoryId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting category" });
        }
    }

    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetCategoryStats(string id, CancellationToken cancellationToken)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!Guid.TryParse(id, out var categoryId))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var stats = await _categoryService.GetCategoryStatsAsync(userId, categoryId, cancellationToken);
            if (stats == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving stats for category {CategoryId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving category stats" });
        }
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return !string.IsNullOrWhiteSpace(userIdValue) && Guid.TryParse(userIdValue, out userId);
    }
}
