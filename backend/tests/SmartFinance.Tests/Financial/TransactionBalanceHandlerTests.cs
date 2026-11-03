using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SmartFinance.Application.Features.Transactions.Commands;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;
using SmartFinance.Infrastructure.Repositories;
using SmartFinance.Tests.Common;
using Xunit;

namespace SmartFinance.Tests.Financial;

/// <summary>Saldo da conta após criar, editar e excluir transações pelos handlers reais.</summary>
public class TransactionBalanceHandlerTests : IAsyncLifetime
{
    private SmartFinanceDbContext _db = null!;
    private UnitOfWork _uow = null!;
    private User _user = null!;
    private Account _account = null!;

    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<SmartFinanceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new SmartFinanceDbContext(options);
        _uow = new UnitOfWork(_db);

        _user = TestDataFactory.CreateUser();
        _account = TestDataFactory.CreateAccount(balance: 0m, user: _user);
        _account.UserId = _user.Id;
        _db.Users.Add(_user);
        _db.Accounts.Add(_account);
        await _db.SaveChangesAsync();
    }

    public async Task DisposeAsync() => await _db.DisposeAsync();

    private CreateTransactionCommandHandler CreateHandler() =>
        new(_uow, NullLogger<CreateTransactionCommandHandler>.Instance);

    private UpdateTransactionCommandHandler UpdateHandler() =>
        new(_uow, NullLogger<UpdateTransactionCommandHandler>.Instance);

    private DeleteTransactionCommandHandler DeleteHandler() =>
        new(_uow, NullLogger<DeleteTransactionCommandHandler>.Instance);

    private Task<SmartFinance.Application.Common.DTOs.TransactionDto> Create(decimal amount, TransactionType type) =>
        CreateHandler().Handle(new CreateTransactionCommand
        {
            UserId = _user.Id,
            AccountId = _account.Id.ToString(),
            Amount = amount,
            Description = "t",
            Type = type
        }, CancellationToken.None);

    [Fact]
    public async Task Create_SeveralTransactions_BalanceIsExact()
    {
        await Create(0.10m, TransactionType.Income);
        await Create(0.20m, TransactionType.Income);
        await Create(1500.00m, TransactionType.Income);
        await Create(99.99m, TransactionType.Expense);
        await Create(0.31m, TransactionType.Expense);

        _account.Balance.Should().Be(1400.00m);
    }

    [Fact]
    public async Task Create_AmountWithMoreThanTwoDecimals_IsRoundedAwayFromZero()
    {
        var dto = await Create(10.005m, TransactionType.Income);

        dto.Amount.Should().Be(10.01m);
        _account.Balance.Should().Be(10.01m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-50)]
    public async Task Create_ZeroOrNegativeAmount_IsRejectedAndBalanceUntouched(int amount)
    {
        var act = () => Create(amount, TransactionType.Expense);

        await act.Should().ThrowAsync<ArgumentException>().WithMessage("Amount must be greater than zero");
        _account.Balance.Should().Be(0m);
        (await _db.Transactions.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Update_ChangingTypeOnly_RecalculatesBalance()
    {
        // Regressão: antes, trocar Receita -> Despesa sem mudar valor/conta não mexia no saldo,
        // e a reversão usava o tipo novo em vez do original.
        var created = await Create(100m, TransactionType.Income);
        _account.Balance.Should().Be(100m);

        await UpdateHandler().Handle(new UpdateTransactionCommand
        {
            Id = created.Id,
            UserId = _user.Id,
            Type = TransactionType.Expense
        }, CancellationToken.None);

        _account.Balance.Should().Be(-100m);
    }

    [Fact]
    public async Task Update_ChangingTypeAndAmount_RevertsWithOriginalType()
    {
        var created = await Create(100m, TransactionType.Income);

        await UpdateHandler().Handle(new UpdateTransactionCommand
        {
            Id = created.Id,
            UserId = _user.Id,
            Type = TransactionType.Expense,
            Amount = 40m
        }, CancellationToken.None);

        _account.Balance.Should().Be(-40m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Update_ZeroOrNegativeAmount_IsRejected(int amount)
    {
        var created = await Create(100m, TransactionType.Income);

        var act = () => UpdateHandler().Handle(new UpdateTransactionCommand
        {
            Id = created.Id,
            UserId = _user.Id,
            Amount = amount
        }, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
        _account.Balance.Should().Be(100m);
    }

    [Fact]
    public async Task Delete_RevertsBalance()
    {
        await Create(250.50m, TransactionType.Income);
        var expense = await Create(0.50m, TransactionType.Expense);

        var deleted = await DeleteHandler().Handle(new DeleteTransactionCommand
        {
            Id = expense.Id,
            UserId = _user.Id
        }, CancellationToken.None);

        deleted.Should().BeTrue();
        _account.Balance.Should().Be(250.50m);
    }
}
