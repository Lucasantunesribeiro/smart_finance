using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartFinance.Application.Common.Interfaces;
using System.Security.Claims;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("ApiRateLimit")]
public class AnalyticsController : ControllerBase
{
    private readonly ILogger<AnalyticsController> _logger;
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(ILogger<AnalyticsController> logger, IAnalyticsService analyticsService)
    {
        _logger = logger;
        _analyticsService = analyticsService;
    }

    [HttpGet("data")]
    public async Task<IActionResult> GetAnalyticsData(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var data = await _analyticsService.GetAnalyticsDataAsync(userId.Value, period, fromDate, toDate, cancellationToken);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving analytics data for user {UserId}", GetUserIdRaw());
            return StatusCode(500, new { message = "An error occurred while retrieving analytics data" });
        }
    }

    [HttpGet("trends")]
    public async Task<IActionResult> GetTrends(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var trends = await _analyticsService.GetTrendsAsync(userId.Value, period, fromDate, toDate, cancellationToken);
            return Ok(trends);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving trends data for user {UserId}", GetUserIdRaw());
            return StatusCode(500, new { message = "An error occurred while retrieving trends data" });
        }
    }

    [HttpGet("cashflow")]
    public async Task<IActionResult> GetCashFlow(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var cashFlow = await _analyticsService.GetCashFlowAsync(userId.Value, period, fromDate, toDate, cancellationToken);
            return Ok(cashFlow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving cash flow data for user {UserId}", GetUserIdRaw());
            return StatusCode(500, new { message = "An error occurred while retrieving cash flow data" });
        }
    }

    [HttpGet("cash-flow")]
    public async Task<IActionResult> GetCashFlowWithHyphen(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        return await GetCashFlow(period, fromDate, toDate, cancellationToken);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] string period = "monthly",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var summary = await _analyticsService.GetSummaryAsync(userId.Value, period, fromDate, toDate, cancellationToken);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving summary data for user {UserId}", GetUserIdRaw());
            return StatusCode(500, new { message = "An error occurred while retrieving summary data" });
        }
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private string GetUserIdRaw() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";
}
