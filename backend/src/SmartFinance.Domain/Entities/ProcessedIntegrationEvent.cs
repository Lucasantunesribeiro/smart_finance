using SmartFinance.Domain.Common;

namespace SmartFinance.Domain.Entities;

public class ProcessedIntegrationEvent : BaseEntity
{
    public string MessageId { get; set; } = string.Empty;
    public string Consumer { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public DateTime ProcessedAtUtc { get; set; } = DateTime.UtcNow;
}
