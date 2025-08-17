using FluentAssertions;
using SmartFinance.Application.Features.Transactions.Commands;
using SmartFinance.Domain.Enums;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Transactions.Commands;

public class CreateTransactionCommandTests
{
    [Fact]
    public void CreateTransactionCommand_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var accountId = "550e8400-e29b-41d4-a716-446655440000";
        var amount = 100.50m;
        var description = "Test transaction";
        var categoryId = "550e8400-e29b-41d4-a716-446655440001";
        var type = TransactionType.Expense;
        var date = DateTime.UtcNow;
        var userId = Guid.NewGuid();

        // Act
        var command = new CreateTransactionCommand
        {
            AccountId = accountId,
            Amount = amount,
            Description = description,
            CategoryId = categoryId,
            Type = type,
            TransactionDate = date,
            UserId = userId
        };

        // Assert
        command.AccountId.Should().Be(accountId);
        command.Amount.Should().Be(amount);
        command.Description.Should().Be(description);
        command.CategoryId.Should().Be(categoryId);
        command.Type.Should().Be(type);
        command.TransactionDate.Should().Be(date);
        command.UserId.Should().Be(userId);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    [InlineData(1000000)]
    public void CreateTransactionCommand_ShouldAllowVariousAmounts_ForValidationTesting(decimal amount)
    {
        // Act
        var command = new CreateTransactionCommand { Amount = amount };

        // Assert
        command.Amount.Should().Be(amount);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void CreateTransactionCommand_ShouldAllowEmptyDescription_ForValidationTesting(string description)
    {
        // Act
        var command = new CreateTransactionCommand { Description = description };

        // Assert
        command.Description.Should().Be(description);
    }
}