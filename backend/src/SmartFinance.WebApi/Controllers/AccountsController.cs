using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;
using SmartFinance.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("ApiRateLimit")]
public class AccountsController : ControllerBase
{
    private readonly ILogger<AccountsController> _logger;
    private readonly SmartFinanceDbContext _context;

    public AccountsController(ILogger<AccountsController> logger, SmartFinanceDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public sealed class CreateAccountRequest
    {
        public string Name { get; set; } = string.Empty;
        public AccountType Type { get; set; } = AccountType.Checking;
        public decimal Balance { get; set; }
        public string? Description { get; set; }
        public string? Currency { get; set; }
    }

    public sealed class UpdateAccountRequest
    {
        public string? Name { get; set; }
        public AccountType? Type { get; set; }
        public decimal? Balance { get; set; }
        public string? Description { get; set; }
        public bool? IsActive { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> GetAccounts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] bool? isActive = null,
        [FromQuery] AccountType? type = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 100) pageSize = 100;

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

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.Name,
                    a.Type,
                    a.Balance,
                    a.Currency,
                    a.IsActive,
                    a.CreatedAt,
                    a.UpdatedAt,
                    a.Description,
                    accountNumber = MaskAccountNumber(a.Id)
                })
                .ToListAsync();

            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            _logger.LogInformation("Retrieved {Count} accounts for user {UserId}", items.Count, userId);
            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving accounts for user");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    [HttpGet("{accountId}")]
    public async Task<IActionResult> GetAccountById(Guid accountId)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            var account = await _context.Accounts
                .AsNoTracking()
                .Where(a => a.Id == accountId && a.UserId == userId && !a.IsDeleted)
                .Select(a => new
                {
                    a.Id,
                    a.Name,
                    a.Type,
                    a.Balance,
                    a.Currency,
                    a.IsActive,
                    a.CreatedAt,
                    a.UpdatedAt,
                    a.Description,
                    accountNumber = MaskAccountNumber(a.Id)
                })
                .FirstOrDefaultAsync();

            if (account == null)
            {
                return NotFound(new { message = "Account not found or doesn't belong to user" });
            }

            _logger.LogInformation("Retrieved account {AccountId} for user {UserId}", accountId, userId);
            return Ok(account);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving account {AccountId} for user", accountId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountRequest request)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Account name is required" });
            }

            if (!Enum.IsDefined(typeof(AccountType), request.Type))
            {
                return BadRequest(new { message = "Invalid account type" });
            }

            var currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim().ToUpperInvariant();

            var account = new Account
            {
                Name = request.Name.Trim(),
                Type = request.Type,
                Balance = request.Balance,
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                Currency = currency,
                IsActive = true,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Accounts.Add(account);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created account {AccountId} for user {UserId}", account.Id, userId);

            return CreatedAtAction(nameof(GetAccountById), new { accountId = account.Id }, new
            {
                account.Id,
                account.Name,
                account.Type,
                account.Balance,
                account.Currency,
                account.IsActive,
                account.CreatedAt,
                account.UpdatedAt,
                account.Description,
                accountNumber = MaskAccountNumber(account.Id)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating account");
            return StatusCode(500, new { message = "An error occurred while creating the account" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAccount(string id, [FromBody] UpdateAccountRequest request)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!Guid.TryParse(id, out var accountId))
            {
                return BadRequest(new { message = "Invalid account id" });
            }

            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == userId && !a.IsDeleted);

            if (account == null)
            {
                return NotFound(new { message = "Account not found" });
            }

            if (request.Name != null)
            {
                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest(new { message = "Account name cannot be empty" });
                }
                account.Name = request.Name.Trim();
            }

            if (request.Type.HasValue)
            {
                if (!Enum.IsDefined(typeof(AccountType), request.Type.Value))
                {
                    return BadRequest(new { message = "Invalid account type" });
                }
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
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated account {AccountId} for user {UserId}", account.Id, userId);

            return Ok(new
            {
                account.Id,
                account.Name,
                account.Type,
                account.Balance,
                account.Currency,
                account.IsActive,
                account.CreatedAt,
                account.UpdatedAt,
                account.Description,
                accountNumber = MaskAccountNumber(account.Id)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating account {AccountId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the account" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAccount(string id)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!Guid.TryParse(id, out var accountId))
            {
                return BadRequest(new { message = "Invalid account id" });
            }

            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == userId && !a.IsDeleted);

            if (account == null)
            {
                return NotFound(new { message = "Account not found" });
            }

            account.IsDeleted = true;
            account.IsActive = false;
            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted account {AccountId} for user {UserId}", account.Id, userId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account {AccountId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the account" });
        }
    }

    [HttpGet("balance")]
    public async Task<IActionResult> GetAccountBalance()
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized();
            }
            
            _logger.LogInformation("Getting account balance for user {UserId}", userId);
            
            // Calculate real balances from database
            var accounts = await _context.Accounts
                .Where(a => a.UserId == userId && !a.IsDeleted)
                .ToListAsync();

            var totalBalance = accounts.Sum(a => a.Balance);
            var totalAssets = accounts.Where(a => a.Balance > 0).Sum(a => a.Balance);
            var totalLiabilities = Math.Abs(accounts.Where(a => a.Balance < 0).Sum(a => a.Balance));
            var netWorth = totalAssets - totalLiabilities;
            var currency = accounts.FirstOrDefault()?.Currency ?? "USD";

            var balanceData = new
            {
                totalBalance,
                totalAssets,
                totalLiabilities,
                netWorth,
                accountsCount = accounts.Count,
                currency,
                lastUpdated = DateTime.UtcNow
            };

            return Ok(balanceData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving account balance");
            return StatusCode(500, new { message = "An error occurred while retrieving account balance" });
        }
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return !string.IsNullOrWhiteSpace(userIdValue) && Guid.TryParse(userIdValue, out userId);
    }

    private static string MaskAccountNumber(Guid accountId)
    {
        var compact = accountId.ToString("N");
        return $"****{compact[^4..]}";
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
