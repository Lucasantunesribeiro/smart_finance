using SmartFinance.Domain.Common;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Domain.Entities;

public class User : BaseAuditableEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    
    public virtual ICollection<Account> Accounts { get; set; } = new List<Account>();
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public virtual ICollection<Budget> Budgets { get; set; } = new List<Budget>();
    public virtual ICollection<Report> Reports { get; set; } = new List<Report>();
}

public class Account : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AccountType Type { get; set; }
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "USD";
    public bool IsActive { get; set; } = true;
    public Guid UserId { get; set; }
    
    public virtual User User { get; set; } = null!;
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}

public class Transaction : BaseAuditableEntity
{
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public TransactionType Type { get; set; }
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }
    public Guid? CategoryId { get; set; }
    public string? ExternalId { get; set; }
    public string? Reference { get; set; }
    public decimal? ExchangeRate { get; set; }
    public string? Notes { get; set; }
    public bool IsRecurring { get; set; } = false;
    public string? RecurrencePattern { get; set; }
    
    public virtual Account Account { get; set; } = null!;
    public virtual User User { get; set; } = null!;
    public virtual Category? Category { get; set; }
    public virtual ICollection<TransactionTag> Tags { get; set; } = new List<TransactionTag>();
}

public class Category : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#000000";
    public string? Icon { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid? ParentId { get; set; }
    public CategoryType Type { get; set; }
    
    public virtual Category? Parent { get; set; }
    public virtual ICollection<Category> Children { get; set; } = new List<Category>();
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public virtual ICollection<Budget> Budgets { get; set; } = new List<Budget>();
}

public class Budget : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal SpentAmount { get; set; } = 0;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public BudgetPeriod Period { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid UserId { get; set; }
    public Guid? CategoryId { get; set; }
    
    public virtual User User { get; set; } = null!;
    public virtual Category? Category { get; set; }
    public virtual ICollection<BudgetAlert> Alerts { get; set; } = new List<BudgetAlert>();
}

public class BudgetAlert : BaseEntity
{
    public decimal ThresholdPercentage { get; set; }
    public bool IsTriggered { get; set; } = false;
    public DateTime? TriggeredAt { get; set; }
    public Guid BudgetId { get; set; }
    
    public virtual Budget Budget { get; set; } = null!;
}

public class Report : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public ReportType Type { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public string Parameters { get; set; } = "{}";
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    public string? FilePath { get; set; }
    public DateTime? GeneratedAt { get; set; }
    public Guid UserId { get; set; }
    
    public virtual User User { get; set; } = null!;
}

public class TransactionTag : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#000000";
    public Guid TransactionId { get; set; }
    
    public virtual Transaction Transaction { get; set; } = null!;
}