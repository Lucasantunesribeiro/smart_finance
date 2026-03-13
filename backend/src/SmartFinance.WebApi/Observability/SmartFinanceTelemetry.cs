using System.Diagnostics;
using Prometheus;

namespace SmartFinance.WebApi.Observability;

public static class SmartFinanceTelemetry
{
    public const string ActivitySourceName = "SmartFinance.WebApi";

    public static readonly ActivitySource ActivitySource = new(ActivitySourceName);

    public static readonly Counter OutboxPublishedTotal = Metrics.CreateCounter(
        "smartfinance_outbox_published_total",
        "Total de mensagens publicadas a partir da outbox.",
        new CounterConfiguration
        {
            LabelNames = ["event_type"]
        });

    public static readonly Counter OutboxFailedTotal = Metrics.CreateCounter(
        "smartfinance_outbox_failed_total",
        "Total de falhas ao publicar mensagens da outbox.",
        new CounterConfiguration
        {
            LabelNames = ["event_type", "status"]
        });

    public static readonly Histogram OutboxPublishDurationSeconds = Metrics.CreateHistogram(
        "smartfinance_outbox_publish_duration_seconds",
        "Tempo gasto para publicar uma mensagem da outbox.",
        new HistogramConfiguration
        {
            LabelNames = ["event_type", "status"],
            Buckets = Histogram.ExponentialBuckets(0.01, 2, 10)
        });

    public static readonly Counter IntegrationConsumerProcessedTotal = Metrics.CreateCounter(
        "smartfinance_integration_consumer_processed_total",
        "Total de eventos consumidos pelo backend.",
        new CounterConfiguration
        {
            LabelNames = ["consumer", "event_type", "status"]
        });

    public static readonly Histogram IntegrationConsumerDurationSeconds = Metrics.CreateHistogram(
        "smartfinance_integration_consumer_duration_seconds",
        "Tempo de processamento de eventos consumidos.",
        new HistogramConfiguration
        {
            LabelNames = ["consumer", "event_type", "status"],
            Buckets = Histogram.ExponentialBuckets(0.01, 2, 10)
        });
}
