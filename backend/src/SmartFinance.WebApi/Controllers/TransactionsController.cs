using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MediatR;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Application.Common.Utils;
using SmartFinance.Application.Features.Transactions.Commands;
using SmartFinance.Application.Features.Transactions.Queries;
using SmartFinance.Domain.Enums;
using System.Linq;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("ApiRateLimit")]
public class TransactionsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<TransactionsController> _logger;

    public TransactionsController(IMediator mediator, ILogger<TransactionsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<TransactionDto>>> GetTransactions([FromQuery] TransactionFilterDto filter)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized();
            }

            // Convert string IDs to Guids if provided
            Guid? accountId = null;
            if (!string.IsNullOrEmpty(filter.AccountId) && Guid.TryParse(filter.AccountId, out var parsedAccountId))
            {
                accountId = parsedAccountId;
            }

            Guid? categoryId = null;
            if (!string.IsNullOrEmpty(filter.CategoryId) && Guid.TryParse(filter.CategoryId, out var parsedCategoryId))
            {
                categoryId = parsedCategoryId;
            }

            var query = new GetTransactionsQuery
            {
                UserId = userId,
                FromDate = filter.FromDate,
                ToDate = filter.ToDate,
                Type = filter.Type,
                Status = filter.Status,
                AccountId = accountId,
                CategoryId = categoryId,
                MinAmount = filter.MinAmount,
                MaxAmount = filter.MaxAmount,
                Search = filter.Search,
                Page = filter.Page,
                PageSize = filter.PageSize,
                SortBy = filter.SortBy,
                SortOrder = filter.SortOrder
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transactions");
            return StatusCode(500, new { message = "An error occurred while retrieving transactions" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TransactionDto>> GetTransaction(Guid id)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized();
            }

            var query = new GetTransactionByIdQuery
            {
                Id = id,
                UserId = userId
            };

            var result = await _mediator.Send(query);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transaction {TransactionId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the transaction" });
        }
    }

    [HttpPost("debug")]
    public async Task<IActionResult> DebugCreateTransaction([FromBody] CreateTransactionDto transactionData)
    {
        try
        {
            _logger.LogInformation("=== TRANSACTION DEBUG ENDPOINT ===");
            _logger.LogInformation("Raw data received: {RawData}", System.Text.Json.JsonSerializer.Serialize(transactionData));
            _logger.LogInformation("Content-Type: {ContentType}", Request.ContentType);
            _logger.LogInformation("Request Headers: {Headers}", Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString()));
            
            _logger.LogInformation("Deserialized data: {Data}", System.Text.Json.JsonSerializer.Serialize(transactionData));
            
            // Manual validation
            var errors = new List<string>();
            
            if (transactionData == null)
                errors.Add("Transaction data is null");
            else
            {
                if (string.IsNullOrEmpty(transactionData.Description))
                    errors.Add("Description is required");
                    
                if (transactionData.Amount <= 0)
                    errors.Add($"Invalid amount: {transactionData.Amount}");
                    
                if (string.IsNullOrEmpty(transactionData.AccountId))
                    errors.Add("AccountId is required");
                else if (!Guid.TryParse(transactionData.AccountId, out _))
                    errors.Add("AccountId is not a valid GUID format");
            }
            
            if (errors.Any())
            {
                _logger.LogWarning("Validation errors found: {Errors}", string.Join(", ", errors));
                return BadRequest(new { 
                    message = "Validation failed",
                    errors, 
                    receivedData = transactionData
                });
            }
            
            return Ok(new { 
                message = "Debug successful - data is valid", 
                receivedData = transactionData,
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in debug endpoint");
            return BadRequest(new { 
                error = ex.Message, 
                receivedData = transactionData,
                stackTrace = ex.StackTrace 
            });
        }
    }

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> CreateTransaction([FromBody] CreateTransactionDto createTransactionDto)
    {
        try
        {
            // Log the incoming request data
            _logger.LogInformation("Creating transaction - Request data: {@RequestData}", createTransactionDto);
            
            // Validate model state
            if (!ModelState.IsValid)
            {
                var errors = ModelState.SelectMany(x => x.Value.Errors.Select(e => e.ErrorMessage)).ToList();
                _logger.LogWarning("Model validation failed: {@Errors}", errors);
                return BadRequest(new { message = "Invalid model data", errors });
            }

            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                _logger.LogWarning("Unauthorized access attempt - invalid user ID claim");
                return Unauthorized();
            }

            _logger.LogInformation("Creating transaction for user: {UserId}", userId);

            var command = new CreateTransactionCommand
            {
                Amount = createTransactionDto.Amount,
                Description = createTransactionDto.Description,
                TransactionDate = createTransactionDto.TransactionDate,
                Type = createTransactionDto.Type,
                AccountId = createTransactionDto.AccountId,
                UserId = userId,
                CategoryId = createTransactionDto.CategoryId,
                Reference = createTransactionDto.Reference,
                Notes = createTransactionDto.Notes,
                IsRecurring = createTransactionDto.IsRecurring,
                RecurrencePattern = createTransactionDto.RecurrencePattern,
                TagNames = createTransactionDto.TagNames
            };

            _logger.LogInformation("Sending command to mediator: {@Command}", command);
            var result = await _mediator.Send(command);
            
            _logger.LogInformation("Transaction created successfully with ID: {TransactionId}", result.Id);
            return CreatedAtAction(nameof(GetTransaction), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid transaction data - ArgumentException: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transaction - Exception type: {ExceptionType}, Message: {Message}", ex.GetType().Name, ex.Message);
            return StatusCode(500, new { message = "An error occurred while creating the transaction" });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TransactionDto>> UpdateTransaction(Guid id, [FromBody] UpdateTransactionDto updateTransactionDto)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized();
            }

            var command = new UpdateTransactionCommand
            {
                Id = id,
                UserId = userId,
                Amount = updateTransactionDto.Amount,
                Description = updateTransactionDto.Description,
                TransactionDate = updateTransactionDto.TransactionDate,
                Type = updateTransactionDto.Type,
                Status = updateTransactionDto.Status,
                AccountId = updateTransactionDto.AccountId,
                CategoryId = updateTransactionDto.CategoryId,
                Reference = updateTransactionDto.Reference,
                Notes = updateTransactionDto.Notes,
                IsRecurring = updateTransactionDto.IsRecurring,
                RecurrencePattern = updateTransactionDto.RecurrencePattern,
                TagNames = updateTransactionDto.TagNames
            };

            var result = await _mediator.Send(command);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid transaction data for update");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating transaction {TransactionId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the transaction" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteTransaction(Guid id)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized();
            }

            var command = new DeleteTransactionCommand
            {
                Id = id,
                UserId = userId
            };

            var result = await _mediator.Send(command);
            if (!result)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting transaction {TransactionId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the transaction" });
        }
    }

    [HttpGet("summary")]
    public async Task<ActionResult<TransactionSummaryDto>> GetTransactionSummary([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized();
            }

            var normalizedFrom = NormalizeToUtc(fromDate ?? DateTime.UtcNow.AddMonths(-1));
            var normalizedTo = NormalizeToUtc(toDate ?? DateTime.UtcNow);

            var query = new GetTransactionSummaryQuery
            {
                UserId = userId,
                FromDate = normalizedFrom,
                ToDate = normalizedTo,
                StartDate = normalizedFrom,
                EndDate = normalizedTo
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transaction summary");
            return StatusCode(500, new { message = "An error occurred while retrieving the transaction summary" });
        }
    }

    [HttpPost("{id}/close")]
    public async Task<IActionResult> CloseTransaction(Guid id)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized();
            }

            var command = new UpdateTransactionCommand
            {
                Id = id,
                UserId = userId,
                Status = TransactionStatus.Completed
            };

            var result = await _mediator.Send(command);
            if (result == null)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing transaction {TransactionId}", id);
            return StatusCode(500, new { message = "An error occurred while closing the transaction" });
        }
    }

    private static DateTime NormalizeToUtc(DateTime value)
    {
        return DateTimeUtils.NormalizeToUtc(value);
    }
}
