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

    [HttpGet]
    public async Task<IActionResult> GetAccounts()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            var accounts = await _context.Accounts
                .Where(a => a.UserId == Guid.Parse(userId))
                .Select(a => new
                {
                    a.Id,
                    a.Name,
                    a.Type,
                    a.Balance,
                    a.Currency,
                    a.IsActive,
                    a.CreatedAt,
                    a.UpdatedAt
                })
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} accounts for user {UserId}", accounts.Count, userId);
            return Ok(accounts);
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
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            var account = await _context.Accounts
                .Where(a => a.Id == accountId && a.UserId == Guid.Parse(userId))
                .Select(a => new
                {
                    a.Id,
                    a.Name,
                    a.Type,
                    a.Balance,
                    a.Currency,
                    a.IsActive,
                    a.CreatedAt,
                    a.UpdatedAt
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
    public async Task<IActionResult> CreateAccount([FromBody] object accountData)
    {
        try
        {
            // TODO: Implement real account creation in database
            _logger.LogInformation("Creating new account");
            return StatusCode(501, new { message = "Account creation not yet implemented" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating account");
            return StatusCode(500, new { message = "An error occurred while creating the account" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAccount(string id, [FromBody] object accountData)
    {
        try
        {
            // TODO: Implement real account update in database
            _logger.LogInformation("Updating account {AccountId}", id);
            return StatusCode(501, new { message = "Account update not yet implemented" });
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
            // TODO: Implement real account deletion from database
            _logger.LogInformation("Deleting account {AccountId}", id);
            return StatusCode(501, new { message = "Account deletion not yet implemented" });
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
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
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

            var balanceData = new
            {
                totalBalance = totalBalance,
                totalAssets = totalAssets,
                totalLiabilities = totalLiabilities,
                netWorth = netWorth
            };

            return Ok(balanceData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving account balance");
            return StatusCode(500, new { message = "An error occurred while retrieving account balance" });
        }
    }
} 