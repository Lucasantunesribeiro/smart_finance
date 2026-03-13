namespace SmartFinance.Application.Common.DTOs;

public class AnalyticsDataPointDto
{
    public string Period { get; set; } = string.Empty;
    public decimal Income { get; set; }
    public decimal Expenses { get; set; }
    public decimal Net { get; set; }
    public int TransactionCount { get; set; }
}

public class AnalyticsCategoryTrendDto
{
    public Guid? CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public int Count { get; set; }
}

public class AnalyticsPeriodSummaryDto
{
    public decimal Income { get; set; }
    public decimal Expenses { get; set; }
    public decimal Net { get; set; }
    public int TransactionCount { get; set; }
}

public class AnalyticsChangeDto
{
    public decimal IncomeChange { get; set; }
    public decimal ExpensesChange { get; set; }
}

public class AnalyticsTrendsDto
{
    public AnalyticsPeriodSummaryDto CurrentPeriod { get; set; } = new();
    public AnalyticsPeriodSummaryDto PreviousPeriod { get; set; } = new();
    public AnalyticsChangeDto Changes { get; set; } = new();
    public List<AnalyticsCategoryTrendDto> TopCategories { get; set; } = new();
}

public class CashFlowPointDto
{
    public string Period { get; set; } = string.Empty;
    public decimal Inflow { get; set; }
    public decimal Outflow { get; set; }
    public decimal Net { get; set; }
}

public class AnalyticsCategoryBreakdownDto
{
    public string? CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}

public class AnalyticsSummaryDto
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetAmount { get; set; }
    public int TransactionCount { get; set; }
    public decimal AvgTransactionAmount { get; set; }
    public decimal LargestIncome { get; set; }
    public decimal LargestExpense { get; set; }
    public decimal SavingsRate { get; set; }
    public decimal BudgetUtilization { get; set; }
    public List<AnalyticsCategoryBreakdownDto> Categories { get; set; } = new();
    public List<AnalyticsCategoryBreakdownDto> TopCategories { get; set; } = new();
}
