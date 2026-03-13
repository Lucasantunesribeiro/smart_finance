using System.Diagnostics;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using SmartFinance.Domain.Constants;
using SmartFinance.Infrastructure.Data;
using SmartFinance.WebApi.Observability;

namespace SmartFinance.WebApi.Messaging;

public sealed class OutboxPublisherService : BackgroundService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<OutboxPublisherService> _logger;
    private readonly RabbitMqOptions _options;

    private IConnection? _connection;

    public OutboxPublisherService(
        IServiceScopeFactory serviceScopeFactory,
        IOptions<RabbitMqOptions> options,
        ILogger<OutboxPublisherService> logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("RabbitMQ outbox publisher is disabled.");
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                EnsureConnection();
                await PublishPendingMessagesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while publishing outbox messages.");
                CloseConnection();
            }

            await Task.Delay(TimeSpan.FromSeconds(_options.PublisherPollIntervalSeconds), stoppingToken);
        }
    }

    public override Task StopAsync(CancellationToken cancellationToken)
    {
        CloseConnection();
        return base.StopAsync(cancellationToken);
    }

    private async Task PublishPendingMessagesAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SmartFinanceDbContext>();
        var now = DateTime.UtcNow;

        var messages = await dbContext.OutboxMessages
            .Where(message =>
                !message.IsDeleted &&
                (message.Status == OutboxMessageStatuses.Pending || message.Status == OutboxMessageStatuses.Retrying) &&
                message.AvailableAt <= now)
            .OrderBy(message => message.CreatedAt)
            .Take(_options.PublisherBatchSize)
            .ToListAsync(cancellationToken);

        if (messages.Count == 0)
        {
            return;
        }

        using var channel = _connection!.CreateModel();
        RabbitMqTopology.Configure(channel, _options);

        foreach (var message in messages)
        {
            var status = "success";
            var stopwatch = Stopwatch.StartNew();

            try
            {
                using var activity = SmartFinanceTelemetry.ActivitySource.StartActivity("outbox.publish", ActivityKind.Producer);
                activity?.SetTag("messaging.system", "rabbitmq");
                activity?.SetTag("messaging.destination.name", _options.ExchangeName);
                activity?.SetTag("messaging.rabbitmq.routing_key", message.RoutingKey);
                activity?.SetTag("messaging.message.id", message.Id.ToString("N"));
                activity?.SetTag("messaging.operation", "publish");
                activity?.SetTag("event.type", message.EventType);
                activity?.SetTag("correlation.id", message.CorrelationId);

                var properties = channel.CreateBasicProperties();
                properties.Persistent = true;
                properties.MessageId = message.Id.ToString("N");
                properties.Type = message.EventType;
                properties.CorrelationId = message.CorrelationId;
                properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
                properties.Headers = new Dictionary<string, object?>
                {
                    ["x-event-type"] = message.EventType,
                    ["x-retry-count"] = message.RetryCount
                };

                var payload = Encoding.UTF8.GetBytes(message.Payload);
                channel.BasicPublish(
                    exchange: _options.ExchangeName,
                    routingKey: message.RoutingKey,
                    basicProperties: properties,
                    body: payload);

                message.Status = OutboxMessageStatuses.Published;
                message.PublishedAt = DateTime.UtcNow;
                message.LastError = null;
                message.RetryCount = 0;

                SmartFinanceTelemetry.OutboxPublishedTotal
                    .WithLabels(message.EventType)
                    .Inc();
            }
            catch (Exception ex)
            {
                message.RetryCount += 1;
                message.LastError = Truncate(ex.Message, 4000);
                message.AvailableAt = DateTime.UtcNow.AddSeconds(Math.Pow(2, Math.Min(message.RetryCount, 5)));
                message.Status = message.RetryCount >= _options.PublisherMaxRetries
                    ? OutboxMessageStatuses.DeadLettered
                    : OutboxMessageStatuses.Retrying;
                status = message.Status;

                SmartFinanceTelemetry.OutboxFailedTotal
                    .WithLabels(message.EventType, message.Status)
                    .Inc();

                _logger.LogWarning(
                    ex,
                    "Failed to publish outbox message {OutboxMessageId}. RetryCount={RetryCount} Status={Status}",
                    message.Id,
                    message.RetryCount,
                    message.Status);
            }
            finally
            {
                stopwatch.Stop();
                SmartFinanceTelemetry.OutboxPublishDurationSeconds
                    .WithLabels(message.EventType, status)
                    .Observe(stopwatch.Elapsed.TotalSeconds);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private void EnsureConnection()
    {
        if (_connection is { IsOpen: true })
        {
            return;
        }

        CloseConnection();

        var factory = new ConnectionFactory
        {
            Uri = new Uri(_options.ConnectionUri),
            DispatchConsumersAsync = true,
            AutomaticRecoveryEnabled = true
        };

        _connection = factory.CreateConnection();
        _logger.LogInformation("RabbitMQ connection established for outbox publisher.");
    }

    private void CloseConnection()
    {
        try
        {
            _connection?.Close();
            _connection?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error while closing RabbitMQ publisher connection.");
        }
        finally
        {
            _connection = null;
        }
    }

    private static string Truncate(string value, int maxLength)
    {
        return value.Length <= maxLength ? value : value[..maxLength];
    }
}
