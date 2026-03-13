namespace SmartFinance.Domain.Constants;

public static class OutboxMessageStatuses
{
    public const string Pending = "Pending";
    public const string Retrying = "Retrying";
    public const string Published = "Published";
    public const string DeadLettered = "DeadLettered";
}
