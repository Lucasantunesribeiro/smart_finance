using SmartFinance.Application.Common.DTOs;

namespace SmartFinance.Application.Common.Interfaces;

public interface IAnalyticsService
{
    Task<List<AnalyticsDataPointDto>> GetAnalyticsDataAsync(Guid userId, string period, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
    Task<AnalyticsTrendsDto> GetTrendsAsync(Guid userId, string period, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
    Task<List<CashFlowPointDto>> GetCashFlowAsync(Guid userId, string period, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
    Task<AnalyticsSummaryDto> GetSummaryAsync(Guid userId, string period, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
}
