using SmartFinance.Domain.Common;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Domain.Entities;

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
    public bool IsRecurring { get; set; }
    public string? RecurrencePattern { get; set; }

    public virtual Account Account { get; set; } = null!;
    public virtual User User { get; set; } = null!;
    public virtual Category? Category { get; set; }
    public virtual ICollection<TransactionTag> Tags { get; set; } = new List<TransactionTag>();
}
