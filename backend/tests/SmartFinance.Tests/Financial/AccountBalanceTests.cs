using MoneyRules = SmartFinance.Domain.Common.Money;
using FluentAssertions;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using Xunit;

namespace SmartFinance.Tests.Financial;

public class AccountBalanceTests
{
    [Fact]
    public void ApplyTransaction_ManySmallAmounts_HasNoFloatDrift()
    {
        var account = new Account { Balance = 0m };

        for (var i = 0; i < 10; i++)
        {
            account.ApplyTransaction(TransactionType.Income, 0.1m);
        }
        account.ApplyTransaction(TransactionType.Expense, 0.3m);

        account.Balance.Should().Be(0.7m);
    }

    [Fact]
    public void ApplyTransaction_SequenceOfIncomeAndExpense_ProducesExactBalance()
    {
        var account = new Account { Balance = 1000.00m };

        account.ApplyTransaction(TransactionType.Income, 2500.35m);
        account.ApplyTransaction(TransactionType.Expense, 1200.10m);
        account.ApplyTransaction(TransactionType.Expense, 89.99m);
        account.ApplyTransaction(TransactionType.Expense, 0.01m);
        account.ApplyTransaction(TransactionType.Income, 0.20m);

        account.Balance.Should().Be(2210.45m);
    }

    [Fact]
    public void ApplyTransaction_AllowsNegativeBalance()
    {
        var account = new Account { Balance = 10m, Type = AccountType.Credit };

        account.ApplyTransaction(TransactionType.Expense, 25.50m);

        account.Balance.Should().Be(-15.50m);
    }

    [Fact]
    public void RevertTransaction_UndoesApply()
    {
        var account = new Account { Balance = 100m };

        account.ApplyTransaction(TransactionType.Expense, 33.33m);
        account.RevertTransaction(TransactionType.Expense, 33.33m);

        account.Balance.Should().Be(100m);
    }

    [Fact]
    public void Transfer_DoesNotChangeBalance()
    {
        var account = new Account { Balance = 100m };

        account.ApplyTransaction(TransactionType.Transfer, 50m);

        account.Balance.Should().Be(100m);
    }

    [Fact]
    public void ApplyTransaction_OverflowingColumnPrecision_Throws()
    {
        var account = new Account { Balance = MoneyRules.MaxAbsoluteValue };

        var act = () => account.ApplyTransaction(TransactionType.Income, 1m);

        act.Should().Throw<ArgumentException>();
    }
}
