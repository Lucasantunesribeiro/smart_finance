using FluentAssertions;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Domain.Common;
using Xunit;

namespace SmartFinance.Tests.Domain.Entities;

public class TransactionTests
{
    [Fact]
    public void Transaction_ShouldInitializeWithDefaultValues()
    {
        // Act
        var transaction = new Transaction();

        // Assert
        transaction.Id.Should().NotBeEmpty();
        transaction.Amount.Should().Be(0);
        transaction.Description.Should().BeEmpty();
        transaction.TransactionDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        transaction.Type.Should().Be(TransactionType.Income);
        transaction.Status.Should().Be(TransactionStatus.Pending);
        transaction.AccountId.Should().BeEmpty();
        transaction.UserId.Should().BeEmpty();
        transaction.CategoryId.Should().BeNull();
        transaction.ExternalId.Should().BeNull();
        transaction.Reference.Should().BeNull();
        transaction.ExchangeRate.Should().BeNull();
        transaction.Notes.Should().BeNull();
        transaction.IsRecurring.Should().BeFalse();
        transaction.RecurrencePattern.Should().BeNull();
        transaction.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        transaction.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        transaction.IsDeleted.Should().BeFalse();
        transaction.Tags.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public void Transaction_ShouldSetPropertiesCorrectly()
    {
        // Arrange
        var amount = 150.75m;
        var description = "Grocery shopping";
        var transactionDate = DateTime.UtcNow.AddDays(-2);
        var type = TransactionType.Expense;
        var status = TransactionStatus.Completed;
        var accountId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        var externalId = "EXT123";
        var reference = "REF456";
        var exchangeRate = 1.2m;
        var notes = "Weekly groceries";
        var recurrencePattern = "WEEKLY";

        // Act
        var transaction = new Transaction
        {
            Amount = amount,
            Description = description,
            TransactionDate = transactionDate,
            Type = type,
            Status = status,
            AccountId = accountId,
            UserId = userId,
            CategoryId = categoryId,
            ExternalId = externalId,
            Reference = reference,
            ExchangeRate = exchangeRate,
            Notes = notes,
            IsRecurring = true,
            RecurrencePattern = recurrencePattern
        };

        // Assert
        transaction.Amount.Should().Be(amount);
        transaction.Description.Should().Be(description);
        transaction.TransactionDate.Should().Be(transactionDate);
        transaction.Type.Should().Be(type);
        transaction.Status.Should().Be(status);
        transaction.AccountId.Should().Be(accountId);
        transaction.UserId.Should().Be(userId);
        transaction.CategoryId.Should().Be(categoryId);
        transaction.ExternalId.Should().Be(externalId);
        transaction.Reference.Should().Be(reference);
        transaction.ExchangeRate.Should().Be(exchangeRate);
        transaction.Notes.Should().Be(notes);
        transaction.IsRecurring.Should().BeTrue();
        transaction.RecurrencePattern.Should().Be(recurrencePattern);
    }

    [Theory]
    [InlineData(TransactionType.Income)]
    [InlineData(TransactionType.Expense)]
    [InlineData(TransactionType.Transfer)]
    public void Transaction_ShouldAcceptAllTransactionTypes(TransactionType transactionType)
    {
        // Act
        var transaction = new Transaction { Type = transactionType };

        // Assert
        transaction.Type.Should().Be(transactionType);
    }

    [Theory]
    [InlineData(TransactionStatus.Pending)]
    [InlineData(TransactionStatus.Completed)]
    [InlineData(TransactionStatus.Failed)]
    [InlineData(TransactionStatus.Cancelled)]
    public void Transaction_ShouldAcceptAllTransactionStatuses(TransactionStatus status)
    {
        // Act
        var transaction = new Transaction { Status = status };

        // Assert
        transaction.Status.Should().Be(status);
    }

    [Fact]
    public void Transaction_ShouldAllowNegativeAmount()
    {
        // Arrange
        var negativeAmount = -100.50m;

        // Act
        var transaction = new Transaction { Amount = negativeAmount };

        // Assert
        transaction.Amount.Should().Be(negativeAmount);
    }

    [Fact]
    public void Transaction_ShouldInheritFromBaseAuditableEntity()
    {
        // Act
        var transaction = new Transaction();

        // Assert
        transaction.Should().BeAssignableTo<BaseAuditableEntity>();
    }
}