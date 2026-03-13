using SmartFinance.Application.Common.DTOs;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Application.Common.Interfaces;

public interface IBudgetService
{
    Task<PagedResponseDto<BudgetItemDto>> GetBudgetsAsync(Guid userId, int page, int pageSize, BudgetPeriod? period, bool? isActive, string? categoryId, DateTime? fromDate, DateTime? toDate, string? search, string? sortBy, string? sortOrder, CancellationToken cancellationToken = default);
    Task<BudgetItemDto?> GetBudgetAsync(Guid userId, Guid budgetId, CancellationToken cancellationToken = default);
    Task<BudgetItemDto> CreateBudgetAsync(Guid userId, BudgetCreateRequestDto request, CancellationToken cancellationToken = default);
    Task<BudgetItemDto?> UpdateBudgetAsync(Guid userId, Guid budgetId, BudgetUpdateRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteBudgetAsync(Guid userId, Guid budgetId, CancellationToken cancellationToken = default);
    Task<BudgetSummaryDto> GetBudgetSummaryAsync(Guid userId, CancellationToken cancellationToken = default);
}
