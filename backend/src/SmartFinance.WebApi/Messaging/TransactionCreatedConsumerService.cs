using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Infrastructure.Data;
using SmartFinance.WebApi.Hubs;
using SmartFinance.WebApi.Observability;

namespace SmartFinance.WebApi.Messaging;

public sealed class TransactionCreatedConsumerService : BackgroundService
{
    private const string ConsumerName = "transaction-created-notifier";
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<TransactionCreatedConsumerService> _logger;
    private readonly RabbitMqOptions _options;

    private IConnection? _connection;
    private IModel? _channel;

    public TransactionCreatedConsumerService(
        IServiceScopeFactory serviceScopeFactory,
        IOptions<RabbitMqOptions> options,
        ILogger<TransactionCreatedConsumerService> logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("RabbitMQ transaction consumer is disabled.");
            return;
        }

        EnsureConsumerInfrastructure();

        var consumer = new AsyncEventingBasicConsumer(_channel!);
        consumer.Received += async (_, eventArgs) => await HandleMessageAsync(eventArgs, stoppingToken);

        _channel!.BasicConsume(
            queue: _options.TransactionCreatedQueueName,
            autoAck: false,
            consumer: consumer);

        _logger.LogInformation("RabbitMQ consumer started for queue {QueueName}", _options.TransactionCreatedQueueName);

        try
        {
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
        }
    }

    public override Task StopAsync(CancellationToken cancellationToken)
    {
        CloseConsumerInfrastructure();
        return base.StopAsync(cancellationToken);
    }

    private async Task HandleMessageAsync(BasicDeliverEventArgs eventArgs, CancellationToken cancellationToken)
    {
        var messageId = eventArgs.BasicProperties.MessageId;
        if (string.IsNullOrWhiteSpace(messageId))
        {
            messageId = Guid.NewGuid().ToString("N");
        }

        var correlationId = eventArgs.BasicProperties.CorrelationId ?? messageId;
        var eventType = eventArgs.BasicProperties.Type ?? TransactionCreatedIntegrationEvent.CurrentEventType;
        var stopwatch = Stopwatch.StartNew();
        var status = "success";
        using var logScope = _logger.BeginScope(new Dictionary<string, object?>
        {
            ["MessageId"] = messageId,
            ["CorrelationId"] = correlationId,
            ["RoutingKey"] = eventArgs.RoutingKey
        });

        try
        {
            using var activity = SmartFinanceTelemetry.ActivitySource.StartActivity("events.transaction-created.consume", ActivityKind.Consumer);
            activity?.SetTag("messaging.system", "rabbitmq");
            activity?.SetTag("messaging.destination.name", _options.TransactionCreatedQueueName);
            activity?.SetTag("messaging.rabbitmq.routing_key", eventArgs.RoutingKey);
            activity?.SetTag("messaging.message.id", messageId);
            activity?.SetTag("messaging.operation", "process");
            activity?.SetTag("event.type", eventType);
            activity?.SetTag("correlation.id", correlationId);

            var payload = Encoding.UTF8.GetString(eventArgs.Body.ToArray());
            var integrationEvent = JsonSerializer.Deserialize<TransactionCreatedIntegrationEvent>(payload, SerializerOptions)
                ?? throw new InvalidOperationException("TransactionCreatedIntegrationEvent payload is invalid.");

            using var scope = _serviceScopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<SmartFinanceDbContext>();
            var financeHubService = scope.ServiceProvider.GetRequiredService<IFinanceHubService>();

            var alreadyProcessed = await dbContext.ProcessedIntegrationEvents
                .AnyAsync(
                    processed => processed.MessageId == messageId && processed.Consumer == ConsumerName,
                    cancellationToken);

            if (alreadyProcessed)
            {
                status = "duplicate";
                SmartFinanceTelemetry.IntegrationConsumerProcessedTotal
                    .WithLabels(ConsumerName, eventType, status)
                    .Inc();
                _channel!.BasicAck(eventArgs.DeliveryTag, multiple: false);
                return;
            }

            await financeHubService.SendTransactionCreatedAsync(integrationEvent.UserId, new
            {
                id = integrationEvent.TransactionId,
                accountId = integrationEvent.AccountId,
                categoryId = integrationEvent.CategoryId,
                amount = integrationEvent.Amount,
                description = integrationEvent.Description,
                transactionType = integrationEvent.TransactionType,
                transactionDateUtc = integrationEvent.TransactionDateUtc,
                reference = integrationEvent.Reference,
                correlationId
            });

            dbContext.ProcessedIntegrationEvents.Add(new Domain.Entities.ProcessedIntegrationEvent
            {
                MessageId = messageId,
                Consumer = ConsumerName,
                EventType = integrationEvent.EventType,
                ProcessedAtUtc = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync(cancellationToken);
            SmartFinanceTelemetry.IntegrationConsumerProcessedTotal
                .WithLabels(ConsumerName, eventType, status)
                .Inc();
            _channel!.BasicAck(eventArgs.DeliveryTag, multiple: false);
        }
        catch (DbUpdateException ex)
        {
            status = "duplicate";
            SmartFinanceTelemetry.IntegrationConsumerProcessedTotal
                .WithLabels(ConsumerName, eventType, status)
                .Inc();
            _logger.LogWarning(ex, "Duplicate integration event receipt detected. Acknowledging message.");
            _channel!.BasicAck(eventArgs.DeliveryTag, multiple: false);
        }
        catch (Exception ex)
        {
            status = GetFailureStatus(GetRetryCount(eventArgs.BasicProperties.Headers) + 1);
            SmartFinanceTelemetry.IntegrationConsumerProcessedTotal
                .WithLabels(ConsumerName, eventType, status)
                .Inc();
            _logger.LogError(ex, "Failed to process transaction created event.");
            PublishRetryOrDeadLetter(eventArgs, ex);
            _channel!.BasicAck(eventArgs.DeliveryTag, multiple: false);
        }
        finally
        {
            stopwatch.Stop();
            SmartFinanceTelemetry.IntegrationConsumerDurationSeconds
                .WithLabels(ConsumerName, eventType, status)
                .Observe(stopwatch.Elapsed.TotalSeconds);
        }
    }

    private void PublishRetryOrDeadLetter(BasicDeliverEventArgs eventArgs, Exception exception)
    {
        var retryCount = GetRetryCount(eventArgs.BasicProperties.Headers) + 1;
        var targetExchange = retryCount > _options.ConsumerMaxRetries
            ? _options.DeadLetterExchangeName
            : _options.RetryExchangeName;

        var properties = _channel!.CreateBasicProperties();
        properties.Persistent = true;
        properties.MessageId = eventArgs.BasicProperties.MessageId;
        properties.Type = eventArgs.BasicProperties.Type;
        properties.CorrelationId = eventArgs.BasicProperties.CorrelationId;
        properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        properties.Headers = new Dictionary<string, object?>
        {
            ["x-event-type"] = eventArgs.BasicProperties.Type ?? TransactionCreatedIntegrationEvent.CurrentEventType,
            ["x-retry-count"] = retryCount,
            ["x-last-error"] = exception.Message
        };

        _channel.BasicPublish(
            exchange: targetExchange,
            routingKey: _options.TransactionCreatedRoutingKey,
            basicProperties: properties,
            body: eventArgs.Body);
    }

    private void EnsureConsumerInfrastructure()
    {
        if (_connection is { IsOpen: true } && _channel is { IsOpen: true })
        {
            return;
        }

        CloseConsumerInfrastructure();

        var factory = new ConnectionFactory
        {
            Uri = new Uri(_options.ConnectionUri),
            DispatchConsumersAsync = true,
            AutomaticRecoveryEnabled = true
        };

        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();
        _channel.BasicQos(prefetchSize: 0, prefetchCount: _options.PrefetchCount, global: false);
        RabbitMqTopology.Configure(_channel, _options);
    }

    private void CloseConsumerInfrastructure()
    {
        try
        {
            _channel?.Close();
            _channel?.Dispose();
            _connection?.Close();
            _connection?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error while closing RabbitMQ consumer infrastructure.");
        }
        finally
        {
            _channel = null;
            _connection = null;
        }
    }

    private static int GetRetryCount(IDictionary<string, object?>? headers)
    {
        if (headers == null || !headers.TryGetValue("x-retry-count", out var rawValue) || rawValue == null)
        {
            return 0;
        }

        return rawValue switch
        {
            byte value => value,
            sbyte value => value,
            short value => value,
            ushort value => value,
            int value => value,
            long value => (int)value,
            byte[] value when int.TryParse(Encoding.UTF8.GetString(value), out var parsed) => parsed,
            _ => 0
        };
    }

    private string GetFailureStatus(int retryCount)
    {
        return retryCount > _options.ConsumerMaxRetries
            ? "dead_lettered"
            : "retry";
    }
}
