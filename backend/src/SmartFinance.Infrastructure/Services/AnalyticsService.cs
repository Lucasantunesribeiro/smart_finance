using SmartFinance.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;

namespace SmartFinance.Infrastructure.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly SmartFinanceDbContext _context;
    private readonly ILogger<AnalyticsService> _logger;

    public AnalyticsService(SmartFinanceDbContext context, ILogger<AnalyticsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<AnalyticsDataPointDto>> GetAnalyticsDataAsync(Guid userId, string period, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default)
    {
        var endDate = toDate ?? DateTime.UtcNow;
        var startDate = fromDate ?? endDate.AddMonths(-12);

        _logger.LogInformation("Getting analytics data for user {UserId} from {StartDate} to {EndDate}", userId, startDate, endDate);

        var transactions = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= startDate && t.TransactionDate <= endDate && !t.IsDeleted)
            .Select(t => new { t.Amount, t.Type, t.TransactionDate })
            .ToListAsync(cancellationToken);

        return transactions
            .GroupBy(t => period == "daily"
                ? t.TransactionDate.ToString("yyyy-MM-dd")
                : period == "weekly"
                    ? $"{t.TransactionDate.Year}-W{System.Globalization.ISOWeek.GetWeekOfYear(t.TransactionDate):D2}"
                    : t.TransactionDate.ToString("yyyy-MM"))
            .Select(g => new AnalyticsDataPointDto
            {
                Period = g.Key,
                Income = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                Expenses = g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
                Net = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount) - g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
                TransactionCount = g.Count()
            })
            .OrderBy(g => g.Period)
            .ToList();
    }

    public async Task<AnalyticsTrendsDto> GetTrendsAsync(Guid userId, string period, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default)
    {
        var endDate = toDate ?? DateTime.UtcNow;
        var startDate = fromDate ?? endDate.AddMonths(-6);
        var previousStart = startDate.AddMonths(-(int)(endDate - startDate).TotalDays / 30);

        var currentPeriod = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= startDate && t.TransactionDate <= endDate && !t.IsDeleted)
            .GroupBy(t => t.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(t => t.Amount), Count = g.Count() })
            .ToListAsync(cancellationToken);

        var previousPeriod = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= previousStart && t.TransactionDate < startDate && !t.IsDeleted)
            .GroupBy(t => t.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(t => t.Amount), Count = g.Count() })
            .ToListAsync(cancellationToken);

        var currentIncome = currentPeriod.FirstOrDefault(p => p.Type == TransactionType.Income)?.Total ?? 0;
        var currentExpenses = currentPeriod.FirstOrDefault(p => p.Type == TransactionType.Expense)?.Total ?? 0;
        var prevIncome = previousPeriod.FirstOrDefault(p => p.Type == TransactionType.Income)?.Total ?? 0;
        var prevExpenses = previousPeriod.FirstOrDefault(p => p.Type == TransactionType.Expense)?.Total ?? 0;

        var categoryTrends = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= startDate && t.TransactionDate <= endDate && !t.IsDeleted && t.Type == TransactionType.Expense)
            .GroupBy(t => new { t.CategoryId, CategoryName = t.Category != null ? t.Category.Name : "Uncategorized" })
            .Select(g => new AnalyticsCategoryTrendDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.CategoryName,
                Total = g.Sum(t => t.Amount),
                Count = g.Count()
            })
            .OrderByDescending(g => g.Total)
            .Take(10)
            .ToListAsync(cancellationToken);

        return new AnalyticsTrendsDto
        {
            CurrentPeriod = new AnalyticsPeriodSummaryDto
            {
                Income = currentIncome,
                Expenses = currentExpenses,
                Net = currentIncome - currentExpenses,
                TransactionCount = currentPeriod.Sum(p => p.Count)
            },
            PreviousPeriod = new AnalyticsPeriodSummaryDto
            {
                Income = prevIncome,
                Expenses = prevExpenses,
                Net = prevIncome - prevExpenses,
                TransactionCount = previousPeriod.Sum(p => p.Count)
            },
            Changes = new AnalyticsChangeDto
            {
                IncomeChange = Money.PercentageChange(currentIncome, prevIncome),
                ExpensesChange = Money.PercentageChange(currentExpenses, prevExpenses)
            },
            TopCategories = categoryTrends
        };
    }

    public async Task<List<CashFlowPointDto>> GetCashFlowAsync(Guid userId, string period, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default)
    {
        var endDate = toDate ?? DateTime.UtcNow;
        var startDate = fromDate ?? endDate.AddMonths(-6);

        var transactions = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= startDate && t.TransactionDate <= endDate && !t.IsDeleted)
            .Select(t => new { t.Amount, t.Type, t.TransactionDate })
            .ToListAsync(cancellationToken);

        return transactions
            .GroupBy(t => period == "daily" ? t.TransactionDate.ToString("yyyy-MM-dd") : t.TransactionDate.ToString("yyyy-MM"))
            .Select(g => new CashFlowPointDto
            {
                Period = g.Key,
                Inflow = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                Outflow = g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
                Net = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount) - g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount)
            })
            .OrderBy(g => g.Period)
            .ToList();
    }

    public async Task<AnalyticsSummaryDto> GetSummaryAsync(Guid userId, string period, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default)
    {
        var endDate = toDate ?? DateTime.UtcNow;
        var startDate = fromDate ?? endDate.AddMonths(-1);

        var transactions = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= startDate && t.TransactionDate <= endDate && !t.IsDeleted)
            .Select(t => new { t.Amount, t.Type, CategoryName = t.Category != null ? t.Category.Name : "Uncategorized", CategoryId = t.CategoryId })
            .ToListAsync(cancellationToken);

        var totalIncome = transactions.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
        var totalExpenses = transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
        var transactionCount = transactions.Count;
        var avgAmount = Money.Average(transactions.Sum(t => t.Amount), transactionCount);
        var largestIncome = transactions.Where(t => t.Type == TransactionType.Income).Select(t => t.Amount).DefaultIfEmpty(0).Max();
        var largestExpense = transactions.Where(t => t.Type == TransactionType.Expense).Select(t => t.Amount).DefaultIfEmpty(0).Max();
        var savingsRate = totalIncome > 0 ? Money.Percentage(totalIncome - totalExpenses, totalIncome) : 0m;

        var categories = transactions
            .GroupBy(t => new { t.CategoryId, t.CategoryName })
            .Select(g => new AnalyticsCategoryBreakdownDto
            {
                CategoryId = g.Key.CategoryId?.ToString(),
                Name = g.Key.CategoryName,
                Total = g.Sum(t => t.Amount),
                Count = g.Count(),
                Percentage = Money.Percentage(g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount), totalExpenses)
            })
            .OrderByDescending(c => c.Total)
            .ToList();

        var activeBudgets = await _context.Budgets
            .AsNoTracking()
            .Where(b => b.UserId == userId && b.IsActive && b.StartDate <= endDate && b.EndDate >= startDate && !b.IsDeleted)
            .Select(b => new { b.Amount, b.SpentAmount })
            .ToListAsync(cancellationToken);

        var totalBudgetAmount = activeBudgets.Sum(b => b.Amount);
        var totalBudgetSpent = activeBudgets.Sum(b => b.SpentAmount);

        return new AnalyticsSummaryDto
        {
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            NetAmount = totalIncome - totalExpenses,
            TransactionCount = transactionCount,
            AvgTransactionAmount = avgAmount,
            LargestIncome = largestIncome,
            LargestExpense = largestExpense,
            SavingsRate = savingsRate,
            BudgetUtilization = Money.Percentage(totalBudgetSpent, totalBudgetAmount),
            Categories = categories,
            TopCategories = categories.Take(5).ToList()
        };
    }
}
