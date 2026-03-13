using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;

namespace SmartFinance.Infrastructure.Services;

public class AccountService : IAccountService
{
    private readonly SmartFinanceDbContext _context;
    private readonly ILogger<AccountService> _logger;

    public AccountService(SmartFinanceDbContext context, ILogger<AccountService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResponseDto<AccountItemDto>> GetAccountsAsync(Guid userId, int page, int pageSize, bool? isActive, AccountType? type, string? sortBy, string? sortOrder, CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted);

        if (isActive.HasValue)
        {
            query = query.Where(a => a.IsActive == isActive.Value);
        }

        if (type.HasValue)
        {
            query = query.Where(a => a.Type == type.Value);
        }

        query = ApplySorting(query, sortBy, sortOrder);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        _logger.LogInformation("Retrieved {Count} accounts for user {UserId}", items.Count, userId);

        return new PagedResponseDto<AccountItemDto>
        {
            Items = items.Select(MapAccount).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    public async Task<AccountItemDto?> GetAccountByIdAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await _context.Accounts
            .AsNoTracking()
            .Where(a => a.Id == accountId && a.UserId == userId && !a.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        return account == null ? null : MapAccount(account);
    }

    public async Task<AccountItemDto> CreateAccountAsync(Guid userId, AccountCreateRequestDto request, CancellationToken cancellationToken = default)
    {
        var account = new Account
        {
            Name = request.Name.Trim(),
            Type = request.Type,
            Balance = request.Balance,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim().ToUpperInvariant(),
            IsActive = true,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
            UpdatedBy = userId.ToString()
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created account {AccountId} for user {UserId}", account.Id, userId);
        return MapAccount(account);
    }

    public async Task<AccountItemDto?> UpdateAccountAsync(Guid userId, Guid accountId, AccountUpdateRequestDto request, CancellationToken cancellationToken = default)
    {
        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == userId && !a.IsDeleted, cancellationToken);

        if (account == null)
        {
            return null;
        }

        if (request.Name != null)
        {
            account.Name = request.Name.Trim();
        }

        if (request.Type.HasValue)
        {
            account.Type = request.Type.Value;
        }

        if (request.Balance.HasValue)
        {
            account.Balance = request.Balance.Value;
        }

        if (request.Description != null)
        {
            account.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        }

        if (request.IsActive.HasValue)
        {
            account.IsActive = request.IsActive.Value;
        }

        account.UpdatedAt = DateTime.UtcNow;
        account.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated account {AccountId} for user {UserId}", account.Id, userId);
        return MapAccount(account);
    }

    public async Task<bool> DeleteAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == userId && !a.IsDeleted, cancellationToken);

        if (account == null)
        {
            return false;
        }

        account.IsDeleted = true;
        account.IsActive = false;
        account.UpdatedAt = DateTime.UtcNow;
        account.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted account {AccountId} for user {UserId}", account.Id, userId);
        return true;
    }

    public async Task<AccountBalanceDto> GetAccountBalanceAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var accounts = await _context.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted)
            .ToListAsync(cancellationToken);

        var totalAssets = accounts.Where(a => a.Balance > 0).Sum(a => a.Balance);
        var totalLiabilities = Math.Abs(accounts.Where(a => a.Balance < 0).Sum(a => a.Balance));

        return new AccountBalanceDto
        {
            TotalBalance = accounts.Sum(a => a.Balance),
            TotalAssets = totalAssets,
            TotalLiabilities = totalLiabilities,
            NetWorth = totalAssets - totalLiabilities,
            AccountsCount = accounts.Count,
            Currency = accounts.FirstOrDefault()?.Currency ?? "USD",
            LastUpdated = DateTime.UtcNow
        };
    }

    private static AccountItemDto MapAccount(Account account)
    {
        var compact = account.Id.ToString("N");
        return new AccountItemDto
        {
            Id = account.Id,
            Name = account.Name,
            Type = account.Type,
            Balance = account.Balance,
            Currency = account.Currency,
            IsActive = account.IsActive,
            CreatedAt = account.CreatedAt,
            UpdatedAt = account.UpdatedAt,
            Description = account.Description,
            AccountNumber = $"****{compact[^4..]}"
        };
    }

    private static IQueryable<Account> ApplySorting(IQueryable<Account> query, string? sortBy, string? sortOrder)
    {
        var descending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        return (sortBy ?? "name").ToLowerInvariant() switch
        {
            "balance" => descending ? query.OrderByDescending(a => a.Balance) : query.OrderBy(a => a.Balance),
            "createdat" => descending ? query.OrderByDescending(a => a.CreatedAt) : query.OrderBy(a => a.CreatedAt),
            "updatedat" => descending ? query.OrderByDescending(a => a.UpdatedAt) : query.OrderBy(a => a.UpdatedAt),
            "type" => descending ? query.OrderByDescending(a => a.Type) : query.OrderBy(a => a.Type),
            _ => descending ? query.OrderByDescending(a => a.Name) : query.OrderBy(a => a.Name)
        };
    }
}
