using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace SmartFinance.WebApi.Hubs;

[Authorize]
public class FinanceHub : Hub
{
    private readonly ILogger<FinanceHub> _logger;

    public FinanceHub(ILogger<FinanceHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null)
        {
            var userId = userIdClaim.Value;
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
            _logger.LogInformation("User {UserId} connected to Finance Hub", userId);
        }
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null)
        {
            var userId = userIdClaim.Value;
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");
            _logger.LogInformation("User {UserId} disconnected from Finance Hub", userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinDashboardGroup()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null)
        {
            var userId = userIdClaim.Value;
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Dashboard_{userId}");
            _logger.LogInformation("User {UserId} joined dashboard group", userId);
        }
    }

    public async Task LeaveDashboardGroup()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null)
        {
            var userId = userIdClaim.Value;
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Dashboard_{userId}");
            _logger.LogInformation("User {UserId} left dashboard group", userId);
        }
    }
}

public interface IFinanceHubService
{
    Task SendTransactionCreatedAsync(Guid userId, object transaction);
    Task SendTransactionUpdatedAsync(Guid userId, object transaction);
    Task SendTransactionDeletedAsync(Guid userId, Guid transactionId);
    Task SendAccountBalanceUpdatedAsync(Guid userId, object account);
    Task SendBudgetAlertAsync(Guid userId, object alert);
    Task SendReportGeneratedAsync(Guid userId, object report);
}

public class FinanceHubService : IFinanceHubService
{
    private readonly IHubContext<FinanceHub> _hubContext;
    private readonly ILogger<FinanceHubService> _logger;

    public FinanceHubService(IHubContext<FinanceHub> hubContext, ILogger<FinanceHubService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task SendTransactionCreatedAsync(Guid userId, object transaction)
    {
        try
        {
            await _hubContext.Clients.Group($"User_{userId}")
                .SendAsync("TransactionCreated", transaction);
            _logger.LogInformation("Transaction created notification sent to user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending transaction created notification to user {UserId}", userId);
        }
    }

    public async Task SendTransactionUpdatedAsync(Guid userId, object transaction)
    {
        try
        {
            await _hubContext.Clients.Group($"User_{userId}")
                .SendAsync("TransactionUpdated", transaction);
            _logger.LogInformation("Transaction updated notification sent to user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending transaction updated notification to user {UserId}", userId);
        }
    }

    public async Task SendTransactionDeletedAsync(Guid userId, Guid transactionId)
    {
        try
        {
            await _hubContext.Clients.Group($"User_{userId}")
                .SendAsync("TransactionDeleted", transactionId);
            _logger.LogInformation("Transaction deleted notification sent to user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending transaction deleted notification to user {UserId}", userId);
        }
    }

    public async Task SendAccountBalanceUpdatedAsync(Guid userId, object account)
    {
        try
        {
            await _hubContext.Clients.Group($"User_{userId}")
                .SendAsync("AccountBalanceUpdated", account);
            _logger.LogInformation("Account balance updated notification sent to user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending account balance updated notification to user {UserId}", userId);
        }
    }

    public async Task SendBudgetAlertAsync(Guid userId, object alert)
    {
        try
        {
            await _hubContext.Clients.Group($"User_{userId}")
                .SendAsync("BudgetAlert", alert);
            _logger.LogInformation("Budget alert sent to user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending budget alert to user {UserId}", userId);
        }
    }

    public async Task SendReportGeneratedAsync(Guid userId, object report)
    {
        try
        {
            await _hubContext.Clients.Group($"User_{userId}")
                .SendAsync("ReportGenerated", report);
            _logger.LogInformation("Report generated notification sent to user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending report generated notification to user {UserId}", userId);
        }
    }
}