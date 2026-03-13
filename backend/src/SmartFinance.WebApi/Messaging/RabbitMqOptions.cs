using SmartFinance.Application.Common.DTOs;

namespace SmartFinance.WebApi.Messaging;

public sealed class RabbitMqOptions
{
    public const string ConfigurationSectionName = "Messaging:RabbitMq";

    public bool Enabled { get; set; }
    public string ConnectionUri { get; set; } = string.Empty;
    public string ExchangeName { get; set; } = "smartfinance.events";
    public string RetryExchangeName { get; set; } = "smartfinance.events.retry";
    public string DeadLetterExchangeName { get; set; } = "smartfinance.events.dlq";
    public string TransactionCreatedQueueName { get; set; } = "smartfinance.transactions.created";
    public string TransactionCreatedRetryQueueName { get; set; } = "smartfinance.transactions.created.retry";
    public string TransactionCreatedDeadLetterQueueName { get; set; } = "smartfinance.transactions.created.dlq";
    public string TransactionCreatedRoutingKey { get; set; } = TransactionCreatedIntegrationEvent.CurrentRoutingKey;
    public ushort PrefetchCount { get; set; } = 1;
    public int PublisherBatchSize { get; set; } = 20;
    public int PublisherPollIntervalSeconds { get; set; } = 5;
    public int PublisherMaxRetries { get; set; } = 5;
    public int ConsumerMaxRetries { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 30;
}
