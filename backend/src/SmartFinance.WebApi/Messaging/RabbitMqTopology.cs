using RabbitMQ.Client;

namespace SmartFinance.WebApi.Messaging;

public static class RabbitMqTopology
{
    public static void Configure(IModel channel, RabbitMqOptions options)
    {
        channel.ExchangeDeclare(options.ExchangeName, ExchangeType.Topic, durable: true, autoDelete: false);
        channel.ExchangeDeclare(options.RetryExchangeName, ExchangeType.Direct, durable: true, autoDelete: false);
        channel.ExchangeDeclare(options.DeadLetterExchangeName, ExchangeType.Direct, durable: true, autoDelete: false);

        channel.QueueDeclare(
            queue: options.TransactionCreatedQueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);

        channel.QueueBind(
            queue: options.TransactionCreatedQueueName,
            exchange: options.ExchangeName,
            routingKey: options.TransactionCreatedRoutingKey);

        channel.QueueDeclare(
            queue: options.TransactionCreatedRetryQueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: new Dictionary<string, object>
            {
                ["x-message-ttl"] = options.RetryDelaySeconds * 1000,
                ["x-dead-letter-exchange"] = options.ExchangeName,
                ["x-dead-letter-routing-key"] = options.TransactionCreatedRoutingKey
            });

        channel.QueueBind(
            queue: options.TransactionCreatedRetryQueueName,
            exchange: options.RetryExchangeName,
            routingKey: options.TransactionCreatedRoutingKey);

        channel.QueueDeclare(
            queue: options.TransactionCreatedDeadLetterQueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);

        channel.QueueBind(
            queue: options.TransactionCreatedDeadLetterQueueName,
            exchange: options.DeadLetterExchangeName,
            routingKey: options.TransactionCreatedRoutingKey);
    }
}
