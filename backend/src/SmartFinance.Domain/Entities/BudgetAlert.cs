using SmartFinance.Domain.Common;

namespace SmartFinance.Domain.Entities;

public class BudgetAlert : BaseEntity
{
    public decimal ThresholdPercentage { get; set; }
    public bool IsTriggered { get; set; }
    public DateTime? TriggeredAt { get; set; }
    public Guid BudgetId { get; set; }

    public virtual Budget Budget { get; set; } = null!;
}
