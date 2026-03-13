using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Application.Features.Transactions.Commands;
using SmartFinance.Domain.Constants;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;
using SmartFinance.Infrastructure.Repositories;
using SmartFinance.Tests.Common;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Transactions.Commands;

public class CreateTransactionCommandHandlerTests
{
    [Fact]
    public async Task Handle_ShouldPersistTransactionCreatedEventIntoOutbox()
    {
        var options = new DbContextOptionsBuilder<SmartFinanceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var dbContext = new SmartFinanceDbContext(options);
        var user = TestDataFactory.CreateUser();
        var account = TestDataFactory.CreateAccount(balance: 500m, user: user);
        account.UserId = user.Id;

        dbContext.Users.Add(user);
        dbContext.Accounts.Add(account);
        await dbContext.SaveChangesAsync();

        var handler = new CreateTransactionCommandHandler(
            new UnitOfWork(dbContext),
            NullLogger<CreateTransactionCommandHandler>.Instance);

        var result = await handler.Handle(new CreateTransactionCommand
        {
            UserId = user.Id,
            AccountId = account.Id.ToString(),
            Amount = 120.50m,
            Description = "Monthly groceries",
            TransactionDate = new DateTime(2026, 3, 12, 14, 30, 0, DateTimeKind.Utc),
            Type = TransactionType.Expense,
            Reference = "INV-1234"
        }, CancellationToken.None);

        var outboxMessage = await dbContext.OutboxMessages.SingleAsync();
        var integrationEvent = JsonSerializer.Deserialize<TransactionCreatedIntegrationEvent>(
            outboxMessage.Payload,
            new JsonSerializerOptions(JsonSerializerDefaults.Web));

        outboxMessage.EventType.Should().Be(TransactionCreatedIntegrationEvent.CurrentEventType);
        outboxMessage.RoutingKey.Should().Be(TransactionCreatedIntegrationEvent.CurrentRoutingKey);
        outboxMessage.AggregateId.Should().Be(result.Id);
        outboxMessage.Status.Should().Be(OutboxMessageStatuses.Pending);

        integrationEvent.Should().NotBeNull();
        integrationEvent!.TransactionId.Should().Be(result.Id);
        integrationEvent.UserId.Should().Be(user.Id);
        integrationEvent.AccountId.Should().Be(account.Id);
        integrationEvent.Amount.Should().Be(120.50m);
        integrationEvent.Reference.Should().Be("INV-1234");

        account.Balance.Should().Be(379.50m);
    }
}
