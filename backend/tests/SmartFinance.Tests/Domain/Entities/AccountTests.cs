using FluentAssertions;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Domain.Common;
using Xunit;

namespace SmartFinance.Tests.Domain.Entities;

public class AccountTests
{
    [Fact]
    public void Account_ShouldInitializeWithDefaultValues()
    {
        // Act
        var account = new Account();

        // Assert
        account.Id.Should().NotBeEmpty();
        account.Name.Should().BeEmpty();
        account.Description.Should().BeNull();
        account.Type.Should().Be(AccountType.Checking);
        account.Balance.Should().Be(0);
        account.Currency.Should().Be("USD");
        account.IsActive.Should().BeTrue();
        account.UserId.Should().BeEmpty();
        account.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        account.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        account.IsDeleted.Should().BeFalse();
        account.Transactions.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public void Account_ShouldSetPropertiesCorrectly()
    {
        // Arrange
        var name = "My Savings Account";
        var description = "Personal savings";
        var type = AccountType.Savings;
        var balance = 1000.50m;
        var currency = "EUR";
        var userId = Guid.NewGuid();

        // Act
        var account = new Account
        {
            Name = name,
            Description = description,
            Type = type,
            Balance = balance,
            Currency = currency,
            IsActive = false,
            UserId = userId
        };

        // Assert
        account.Name.Should().Be(name);
        account.Description.Should().Be(description);
        account.Type.Should().Be(type);
        account.Balance.Should().Be(balance);
        account.Currency.Should().Be(currency);
        account.IsActive.Should().BeFalse();
        account.UserId.Should().Be(userId);
    }

    [Theory]
    [InlineData(AccountType.Checking)]
    [InlineData(AccountType.Savings)]
    [InlineData(AccountType.Investment)]
    [InlineData(AccountType.Credit)]
    [InlineData(AccountType.Loan)]
    [InlineData(AccountType.Other)]
    public void Account_ShouldAcceptAllAccountTypes(AccountType accountType)
    {
        // Act
        var account = new Account { Type = accountType };

        // Assert
        account.Type.Should().Be(accountType);
    }

    [Fact]
    public void Account_ShouldAllowNegativeBalance()
    {
        // Arrange
        var negativeBalance = -500.75m;

        // Act
        var account = new Account { Balance = negativeBalance };

        // Assert
        account.Balance.Should().Be(negativeBalance);
    }

    [Fact]
    public void Account_ShouldInheritFromBaseAuditableEntity()
    {
        // Act
        var account = new Account();

        // Assert
        account.Should().BeAssignableTo<BaseAuditableEntity>();
    }
}