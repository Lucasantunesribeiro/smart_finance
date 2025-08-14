using SmartFinance.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace SmartFinance.Application.Common.DTOs;

public class TransactionDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; }
    public TransactionType Type { get; set; }
    public TransactionStatus Status { get; set; }
    public Guid AccountId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public bool IsRecurring { get; set; }
    public List<TransactionTagDto> Tags { get; set; } = new();
    public List<string> TagNames { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateTransactionDto
{
    [Required(ErrorMessage = "Amount is required")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal Amount { get; set; }
    
    [Required(ErrorMessage = "Description is required")]
    [StringLength(500, MinimumLength = 1, ErrorMessage = "Description must be between 1 and 500 characters")]
    public string Description { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Transaction date is required")]
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    
    [Required(ErrorMessage = "Transaction type is required")]
    public TransactionType Type { get; set; }
    
    [Required(ErrorMessage = "Account ID is required")]
    public string AccountId { get; set; } = string.Empty; // Changed to string to match frontend
    
    [Required(ErrorMessage = "Category ID is required")]
    public string CategoryId { get; set; } = string.Empty; // Changed to required string
    
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public bool IsRecurring { get; set; } = false;
    public string? RecurrencePattern { get; set; }
    public List<string> TagNames { get; set; } = new();
}

public class UpdateTransactionDto
{
    public decimal? Amount { get; set; }
    public string? Description { get; set; }
    public DateTime? TransactionDate { get; set; }
    public TransactionType? Type { get; set; }
    public TransactionStatus? Status { get; set; }
    public string? AccountId { get; set; }
    public string? CategoryId { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public bool? IsRecurring { get; set; }
    public string? RecurrencePattern { get; set; }
    public List<string>? TagNames { get; set; }
}

public class TransactionTagDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}

public class TransactionFilterDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public TransactionType? Type { get; set; }
    public TransactionStatus? Status { get; set; }
    public string? AccountId { get; set; }
    public string? CategoryId { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "TransactionDate";
    public string SortOrder { get; set; } = "desc";
}

public class TransactionSummaryDto
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal NetAmount { get; set; }
    public int TransactionCount { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
}