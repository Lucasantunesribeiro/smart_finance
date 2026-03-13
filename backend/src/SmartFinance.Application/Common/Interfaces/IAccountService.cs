using SmartFinance.Application.Common.DTOs;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Application.Common.Interfaces;

public interface IAccountService
{
    Task<PagedResponseDto<AccountItemDto>> GetAccountsAsync(Guid userId, int page, int pageSize, bool? isActive, AccountType? type, string? sortBy, string? sortOrder, CancellationToken cancellationToken = default);
    Task<AccountItemDto?> GetAccountByIdAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
    Task<AccountItemDto> CreateAccountAsync(Guid userId, AccountCreateRequestDto request, CancellationToken cancellationToken = default);
    Task<AccountItemDto?> UpdateAccountAsync(Guid userId, Guid accountId, AccountUpdateRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
    Task<AccountBalanceDto> GetAccountBalanceAsync(Guid userId, CancellationToken cancellationToken = default);
}
