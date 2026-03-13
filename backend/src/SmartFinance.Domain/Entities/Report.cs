using SmartFinance.Domain.Common;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Domain.Entities;

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
