using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Enums;
using System.Security.Claims;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("ApiRateLimit")]
public class AccountsController : ControllerBase
{
    private readonly ILogger<AccountsController> _logger;
    private readonly IAccountService _accountService;

    public AccountsController(ILogger<AccountsController> logger, IAccountService accountService)
    {
        _logger = logger;
        _accountService = accountService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAccounts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] bool? isActive = null,
        [FromQuery] AccountType? type = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            var result = await _accountService.GetAccountsAsync(userId, page, pageSize, isActive, type, sortBy, sortOrder, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving accounts");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    [HttpGet("{accountId:guid}")]
    public async Task<IActionResult> GetAccountById(Guid accountId, CancellationToken cancellationToken)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("User not authenticated");
            }

            var account = await _accountService.GetAccountByIdAsync(userId, accountId, cancellationToken);
            if (account == null)
            {
                return NotFound(new { message = "Account not found or doesn't belong to user" });
            }

            return Ok(account);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving account {AccountId}", accountId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateAccount([FromBody] AccountCreateRequestDto request, CancellationToken cancellationToken)
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

            var account = await _accountService.CreateAccountAsync(userId, request, cancellationToken);
            return CreatedAtAction(nameof(GetAccountById), new { accountId = account.Id }, account);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating account");
            return StatusCode(500, new { message = "An error occurred while creating the account" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAccount(string id, [FromBody] AccountUpdateRequestDto request, CancellationToken cancellationToken)
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

            if (request.Name != null && string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Account name cannot be empty" });
            }

            if (request.Type.HasValue && !Enum.IsDefined(typeof(AccountType), request.Type.Value))
            {
                return BadRequest(new { message = "Invalid account type" });
            }

            var account = await _accountService.UpdateAccountAsync(userId, accountId, request, cancellationToken);
            if (account == null)
            {
                return NotFound(new { message = "Account not found" });
            }

            return Ok(account);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating account {AccountId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the account" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAccount(string id, CancellationToken cancellationToken)
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

            var deleted = await _accountService.DeleteAccountAsync(userId, accountId, cancellationToken);
            if (!deleted)
            {
                return NotFound(new { message = "Account not found" });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account {AccountId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the account" });
        }
    }

    [HttpGet("balance")]
    public async Task<IActionResult> GetAccountBalance(CancellationToken cancellationToken)
    {
        try
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized();
            }

            var balanceData = await _accountService.GetAccountBalanceAsync(userId, cancellationToken);
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
}
