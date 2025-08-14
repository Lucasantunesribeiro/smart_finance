using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("ApiRateLimit")]
public class BudgetsController : ControllerBase
{
    private readonly ILogger<BudgetsController> _logger;

    public BudgetsController(ILogger<BudgetsController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetBudgets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = userIdClaim?.Value ?? "unknown";
            _logger.LogInformation("Getting budgets for user {UserId}", userId);
            
            // TODO: Replace with real database query to get user budgets
            var budgets = new object[0]; // Empty array until real implementation

            return Ok(new { items = budgets, totalCount = 0, page, pageSize });
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
            // TODO: Implement real budget retrieval from database
            _logger.LogInformation("Getting budget {BudgetId}", id);
            return NotFound(new { message = "Budget not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving budget {BudgetId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the budget" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateBudget([FromBody] object budgetData)
    {
        try
        {
            var newBudget = new
            {
                id = Guid.NewGuid().ToString(),
                name = "Novo Orçamento",
                description = "Orçamento criado pelo usuário",
                categoryId = Guid.NewGuid().ToString(),
                categoryName = "Categoria",
                budgetAmount = 500.00,
                spentAmount = 0.00,
                remainingAmount = 500.00,
                percentage = 0.0,
                period = "monthly",
                startDate = DateTime.UtcNow.Date.AddDays(-DateTime.UtcNow.Day + 1),
                endDate = DateTime.UtcNow.Date.AddDays(-DateTime.UtcNow.Day + 1).AddMonths(1).AddDays(-1),
                isActive = true,
                alertThreshold = 80.0,
                createdAt = DateTime.UtcNow,
                updatedAt = DateTime.UtcNow
            };

            return CreatedAtAction(nameof(GetBudget), new { id = newBudget.id }, newBudget);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating budget");
            return StatusCode(500, new { message = "An error occurred while creating the budget" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBudget(string id, [FromBody] object budgetData)
    {
        try
        {
            var updatedBudget = new
            {
                id,
                name = "Orçamento Atualizado",
                description = "Orçamento atualizado pelo usuário",
                categoryId = Guid.NewGuid().ToString(),
                categoryName = "Categoria",
                budgetAmount = 600.00,
                spentAmount = 200.00,
                remainingAmount = 400.00,
                percentage = 33.3,
                period = "monthly",
                startDate = DateTime.UtcNow.Date.AddDays(-DateTime.UtcNow.Day + 1),
                endDate = DateTime.UtcNow.Date.AddDays(-DateTime.UtcNow.Day + 1).AddMonths(1).AddDays(-1),
                isActive = true,
                alertThreshold = 80.0,
                createdAt = DateTime.UtcNow.AddDays(-10),
                updatedAt = DateTime.UtcNow
            };

            return Ok(updatedBudget);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating budget {BudgetId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the budget" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBudget(string id)
    {
        try
        {
            return Ok(new { message = "Budget deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting budget {BudgetId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the budget" });
        }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetBudgetSummary()
    {
        try
        {
            var summary = new
            {
                totalBudgets = 3,
                activeBudgets = 3,
                totalBudgetAmount = 1900.00,
                totalSpentAmount = 1410.00,
                totalRemainingAmount = 490.00,
                overallPercentage = 74.2,
                budgetsOverThreshold = 1,
                budgetsNearLimit = 2
            };

            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving budget summary");
            return StatusCode(500, new { message = "An error occurred while retrieving budget summary" });
        }
    }
}