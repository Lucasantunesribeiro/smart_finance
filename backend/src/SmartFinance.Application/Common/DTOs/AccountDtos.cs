using SmartFinance.Domain.Enums;

namespace SmartFinance.Application.Common.DTOs;

public class AccountCreateRequestDto
{
    public string Name { get; set; } = string.Empty;
    public AccountType Type { get; set; } = AccountType.Checking;
    public decimal Balance { get; set; }
    public string? Description { get; set; }
    public string? Currency { get; set; }
}

public class AccountUpdateRequestDto
{
    public string? Name { get; set; }
    public AccountType? Type { get; set; }
    public decimal? Balance { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

public class AccountItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "USD";
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? Description { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
}

public class AccountBalanceDto
{
    public decimal TotalBalance { get; set; }
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal NetWorth { get; set; }
    public int AccountsCount { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime LastUpdated { get; set; }
}
