using SmartFinance.Domain.Common;

namespace SmartFinance.Domain.Entities;

public class OutboxMessage : BaseEntity
{
    public string EventType { get; set; } = string.Empty;
    public string RoutingKey { get; set; } = string.Empty;
    public Guid AggregateId { get; set; }
    public string Payload { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public DateTime AvailableAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public string Status { get; set; } = "Pending";
    public int RetryCount { get; set; }
    public string? LastError { get; set; }
}
