namespace SmartFinance.Application.Common.DTOs;

public class CategoryCreateRequestDto
{
    public string Name { get; set; } = string.Empty;
    public int? Type { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public string? ParentCategoryId { get; set; }
}

public class CategoryUpdateRequestDto
{
    public string? Name { get; set; }
    public int? Type { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public string? ParentCategoryId { get; set; }
    public bool? IsActive { get; set; }
}

public class CategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Type { get; set; }
    public string? Description { get; set; }
    public string Color { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string? ParentId { get; set; }
    public string? ParentName { get; set; }
    public bool IsActive { get; set; }
    public int TransactionCount { get; set; }
    public decimal TotalAmount { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class CategoryStatsDto
{
    public int TotalTransactions { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AverageAmount { get; set; }
    public string? LastTransaction { get; set; }
}
