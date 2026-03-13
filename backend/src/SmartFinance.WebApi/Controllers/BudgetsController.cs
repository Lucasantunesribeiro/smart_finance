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
public class BudgetsController : ControllerBase
{
    private readonly ILogger<BudgetsController> _logger;
    private readonly IBudgetService _budgetService;

    public BudgetsController(ILogger<BudgetsController> logger, IBudgetService budgetService)
    {
        _logger = logger;
        _budgetService = budgetService;
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
        [FromQuery] string? sortOrder = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!string.IsNullOrWhiteSpace(categoryId) && !Guid.TryParse(categoryId, out _))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var result = await _budgetService.GetBudgetsAsync(userId, page, pageSize, period, isActive, categoryId, fromDate, toDate, search, sortBy, sortOrder, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving budgets");
            return StatusCode(500, new { message = "An error occurred while retrieving budgets" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBudget(string id, CancellationToken cancellationToken)
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

            var budget = await _budgetService.GetBudgetAsync(userId, budgetId, cancellationToken);
            if (budget == null)
            {
                return NotFound(new { message = "Budget not found" });
            }

            return Ok(budget);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving budget {BudgetId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving budget" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateBudget([FromBody] BudgetCreateRequestDto request, CancellationToken cancellationToken)
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

            if (!string.IsNullOrWhiteSpace(request.CategoryId) && !Guid.TryParse(request.CategoryId, out _))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var budget = await _budgetService.CreateBudgetAsync(userId, request, cancellationToken);
            return CreatedAtAction(nameof(GetBudget), new { id = budget.Id }, budget);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating budget");
            return StatusCode(500, new { message = "An error occurred while creating budget" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBudget(string id, [FromBody] BudgetUpdateRequestDto request, CancellationToken cancellationToken)
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

            if (request.Name != null && string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Budget name cannot be empty" });
            }

            if (request.Allocated.HasValue && request.Allocated.Value <= 0)
            {
                return BadRequest(new { message = "Allocated amount must be greater than zero" });
            }

            if (request.StartDate != null && !DateTime.TryParse(request.StartDate, out _))
            {
                return BadRequest(new { message = "Invalid start date" });
            }

            if (request.EndDate != null && !DateTime.TryParse(request.EndDate, out _))
            {
                return BadRequest(new { message = "Invalid end date" });
            }

            if (request.CategoryId != null && !string.IsNullOrWhiteSpace(request.CategoryId) && !Guid.TryParse(request.CategoryId, out _))
            {
                return BadRequest(new { message = "Invalid category id" });
            }

            var budget = await _budgetService.UpdateBudgetAsync(userId, budgetId, request, cancellationToken);
            if (budget == null)
            {
                return NotFound(new { message = "Budget not found" });
            }

            return Ok(budget);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating budget {BudgetId}", id);
            return StatusCode(500, new { message = "An error occurred while updating budget" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBudget(string id, CancellationToken cancellationToken)
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

            var deleted = await _budgetService.DeleteBudgetAsync(userId, budgetId, cancellationToken);
            if (!deleted)
            {
                return NotFound(new { message = "Budget not found" });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting budget {BudgetId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting budget" });
        }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetBudgetSummary(CancellationToken cancellationToken)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            var summary = await _budgetService.GetBudgetSummaryAsync(userId, cancellationToken);
            return Ok(summary);
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
}
