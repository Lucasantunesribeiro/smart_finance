using SmartFinance.Domain.Common;

namespace SmartFinance.Domain.Entities;

public class TransactionTag : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#000000";
    public Guid TransactionId { get; set; }

    public virtual Transaction Transaction { get; set; } = null!;
}
