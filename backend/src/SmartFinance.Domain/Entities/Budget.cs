using SmartFinance.Domain.Common;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Domain.Entities;

public class Budget : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal SpentAmount { get; set; }
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
