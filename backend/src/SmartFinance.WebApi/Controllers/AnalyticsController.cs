using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;
using System.Security.Claims;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("ApiRateLimit")]
public class AnalyticsController : ControllerBase
{
    private readonly ILogger<AnalyticsController> _logger;
    private readonly SmartFinanceDbContext _context;

    public AnalyticsController(ILogger<AnalyticsController> logger, SmartFinanceDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    [HttpGet("data")]
    public async Task<IActionResult> GetAnalyticsData(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var endDate = toDate ?? DateTime.UtcNow;
            var startDate = fromDate ?? endDate.AddMonths(-12);

            _logger.LogInformation("Getting analytics data for user {UserId} from {StartDate} to {EndDate}",
                userId, startDate, endDate);

            var transactions = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId.Value
                    && t.TransactionDate >= startDate
                    && t.TransactionDate <= endDate
                    && !t.IsDeleted)
                .Select(t => new
                {
                    t.Amount,
                    t.Type,
                    t.TransactionDate,
                    CategoryName = t.Category != null ? t.Category.Name : "Uncategorized",
                    t.CategoryId
                })
                .ToListAsync();

            var grouped = transactions
                .GroupBy(t => period == "daily"
                    ? t.TransactionDate.ToString("yyyy-MM-dd")
                    : period == "weekly"
                        ? $"{t.TransactionDate.Year}-W{System.Globalization.ISOWeek.GetWeekOfYear(t.TransactionDate):D2}"
                        : t.TransactionDate.ToString("yyyy-MM"))
                .Select(g => new
                {
                    period = g.Key,
                    income = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                    expenses = g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
                    net = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount)
                           - g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
                    transactionCount = g.Count()
                })
                .OrderBy(g => g.period)
                .ToList();

            return Ok(grouped);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving analytics data for user {UserId}", GetUserIdRaw());
            return StatusCode(500, new { message = "An error occurred while retrieving analytics data" });
        }
    }

    [HttpGet("trends")]
    public async Task<IActionResult> GetTrends(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var endDate = toDate ?? DateTime.UtcNow;
            var startDate = fromDate ?? endDate.AddMonths(-6);
            var previousStart = startDate.AddMonths(-(int)(endDate - startDate).TotalDays / 30);

            _logger.LogInformation("Getting trends data for user {UserId}", userId);

            var currentPeriod = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId.Value
                    && t.TransactionDate >= startDate
                    && t.TransactionDate <= endDate
                    && !t.IsDeleted)
                .GroupBy(t => t.Type)
                .Select(g => new { Type = g.Key, Total = g.Sum(t => t.Amount), Count = g.Count() })
                .ToListAsync();

            var previousPeriod = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId.Value
                    && t.TransactionDate >= previousStart
                    && t.TransactionDate < startDate
                    && !t.IsDeleted)
                .GroupBy(t => t.Type)
                .Select(g => new { Type = g.Key, Total = g.Sum(t => t.Amount) })
                .ToListAsync();

            var currentIncome = currentPeriod.FirstOrDefault(p => p.Type == TransactionType.Income)?.Total ?? 0;
            var currentExpenses = currentPeriod.FirstOrDefault(p => p.Type == TransactionType.Expense)?.Total ?? 0;
            var prevIncome = previousPeriod.FirstOrDefault(p => p.Type == TransactionType.Income)?.Total ?? 0;
            var prevExpenses = previousPeriod.FirstOrDefault(p => p.Type == TransactionType.Expense)?.Total ?? 0;

            var categoryTrends = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId.Value
                    && t.TransactionDate >= startDate
                    && t.TransactionDate <= endDate
                    && !t.IsDeleted
                    && t.Type == TransactionType.Expense)
                .GroupBy(t => new { t.CategoryId, CategoryName = t.Category != null ? t.Category.Name : "Uncategorized" })
                .Select(g => new
                {
                    categoryId = g.Key.CategoryId,
                    categoryName = g.Key.CategoryName,
                    total = g.Sum(t => t.Amount),
                    count = g.Count()
                })
                .OrderByDescending(g => g.total)
                .Take(10)
                .ToListAsync();

            return Ok(new
            {
                currentPeriod = new
                {
                    income = currentIncome,
                    expenses = currentExpenses,
                    net = currentIncome - currentExpenses,
                    transactionCount = currentPeriod.Sum(p => p.Count)
                },
                previousPeriod = new
                {
                    income = prevIncome,
                    expenses = prevExpenses,
                    net = prevIncome - prevExpenses
                },
                changes = new
                {
                    incomeChange = prevIncome > 0 ? (currentIncome - prevIncome) / prevIncome * 100 : 0,
                    expensesChange = prevExpenses > 0 ? (currentExpenses - prevExpenses) / prevExpenses * 100 : 0
                },
                topCategories = categoryTrends
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving trends data for user {UserId}", GetUserIdRaw());
            return StatusCode(500, new { message = "An error occurred while retrieving trends data" });
        }
    }

    [HttpGet("cashflow")]
    public async Task<IActionResult> GetCashFlow(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var endDate = toDate ?? DateTime.UtcNow;
            var startDate = fromDate ?? endDate.AddMonths(-6);

            _logger.LogInformation("Getting cash flow data for user {UserId}", userId);

            var transactions = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId.Value
                    && t.TransactionDate >= startDate
                    && t.TransactionDate <= endDate
                    && !t.IsDeleted)
                .Select(t => new { t.Amount, t.Type, t.TransactionDate })
                .ToListAsync();

            var cashFlow = transactions
                .GroupBy(t => period == "daily"
                    ? t.TransactionDate.ToString("yyyy-MM-dd")
                    : t.TransactionDate.ToString("yyyy-MM"))
                .Select(g => new
                {
                    period = g.Key,
                    inflow = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                    outflow = g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
                    net = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount)
                          - g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount)
                })
                .OrderBy(g => g.period)
                .ToList();

            return Ok(cashFlow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving cash flow data for user {UserId}", GetUserIdRaw());
            return StatusCode(500, new { message = "An error occurred while retrieving cash flow data" });
        }
    }

    [HttpGet("cash-flow")]
    public async Task<IActionResult> GetCashFlowWithHyphen(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        return await GetCashFlow(period, fromDate, toDate);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var endDate = toDate ?? DateTime.UtcNow;
            var startDate = fromDate ?? endDate.AddMonths(-1);

            _logger.LogInformation("Getting summary data for user {UserId}", userId);

            var transactions = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId.Value
                    && t.TransactionDate >= startDate
                    && t.TransactionDate <= endDate
                    && !t.IsDeleted)
                .Select(t => new
                {
                    t.Amount,
                    t.Type,
                    CategoryName = t.Category != null ? t.Category.Name : "Uncategorized",
                    CategoryId = t.CategoryId
                })
                .ToListAsync();

            var totalIncome = transactions.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
            var totalExpenses = transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
            var transactionCount = transactions.Count;
            var avgAmount = transactionCount > 0 ? transactions.Average(t => t.Amount) : 0;
            var largestIncome = transactions.Where(t => t.Type == TransactionType.Income)
                .Select(t => t.Amount).DefaultIfEmpty(0).Max();
            var largestExpense = transactions.Where(t => t.Type == TransactionType.Expense)
                .Select(t => t.Amount).DefaultIfEmpty(0).Max();
            var savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome * 100 : 0;

            var categories = transactions
                .GroupBy(t => new { t.CategoryId, t.CategoryName })
                .Select(g => new
                {
                    categoryId = g.Key.CategoryId?.ToString(),
                    name = g.Key.CategoryName,
                    total = g.Sum(t => t.Amount),
                    count = g.Count(),
                    percentage = totalExpenses > 0
                        ? Math.Round(g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount) / totalExpenses * 100, 2)
                        : 0m
                })
                .OrderByDescending(c => c.total)
                .ToList();

            var activeBudgets = await _context.Budgets
                .AsNoTracking()
                .Where(b => b.UserId == userId.Value
                    && b.IsActive
                    && b.StartDate <= endDate
                    && b.EndDate >= startDate
                    && !b.IsDeleted)
                .Select(b => new { b.Amount, b.SpentAmount })
                .ToListAsync();

            var budgetUtilization = activeBudgets.Any() && activeBudgets.Sum(b => b.Amount) > 0
                ? activeBudgets.Sum(b => b.SpentAmount) / activeBudgets.Sum(b => b.Amount) * 100
                : 0;

            return Ok(new
            {
                totalIncome,
                totalExpenses,
                netAmount = totalIncome - totalExpenses,
                transactionCount,
                avgTransactionAmount = Math.Round(avgAmount, 2),
                largestIncome,
                largestExpense,
                savingsRate = Math.Round(savingsRate, 2),
                budgetUtilization = Math.Round(budgetUtilization, 2),
                categories,
                topCategories = categories.Take(5)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving summary data for user {UserId}", GetUserIdRaw());
            return StatusCode(500, new { message = "An error occurred while retrieving summary data" });
        }
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private string GetUserIdRaw() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";
}
