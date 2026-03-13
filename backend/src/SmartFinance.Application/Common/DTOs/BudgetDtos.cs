using SmartFinance.Domain.Enums;

namespace SmartFinance.Application.Common.DTOs;

public class BudgetCreateRequestDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Allocated { get; set; }
    public string? CategoryId { get; set; }
    public BudgetPeriod Period { get; set; } = BudgetPeriod.Monthly;
    public string? Description { get; set; }
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
}

public class BudgetUpdateRequestDto
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

public class BudgetItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Allocated { get; set; }
    public decimal Spent { get; set; }
    public decimal Remaining { get; set; }
    public decimal Percentage { get; set; }
    public string? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int Period { get; set; }
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class BudgetSummaryDto
{
    public int TotalBudgets { get; set; }
    public decimal TotalAllocated { get; set; }
    public decimal TotalSpent { get; set; }
    public decimal TotalRemaining { get; set; }
    public int OverBudgetCount { get; set; }
    public int OnTrackCount { get; set; }
}
