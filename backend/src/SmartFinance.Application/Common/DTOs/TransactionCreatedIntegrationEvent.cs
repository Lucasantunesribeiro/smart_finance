namespace SmartFinance.Application.Common.DTOs;

public class TransactionCreatedIntegrationEvent
{
    public const string CurrentEventType = "finance.transaction.created.v1";
    public const string CurrentRoutingKey = "finance.transaction.created";

    public Guid TransactionId { get; set; }
    public Guid UserId { get; set; }
    public Guid AccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    public DateTime TransactionDateUtc { get; set; }
    public string? Reference { get; set; }
    public string EventType { get; set; } = CurrentEventType;
}
