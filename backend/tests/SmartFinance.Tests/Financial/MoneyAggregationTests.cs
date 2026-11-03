using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;
using SmartFinance.Infrastructure.Services;
using Xunit;

namespace SmartFinance.Tests.Financial;

/// <summary>
/// Agregações monetárias dos serviços (orçamento e categoria) devem somar em decimal.
/// Rodam em SQLite em memória (provedor relacional real, caminho de agregação em memória)
/// e no provedor InMemory (caminho de agregação no provedor, como no PostgreSQL).
/// </summary>
public abstract class MoneyAggregationTestsBase : IAsyncLifetime
{
    protected SmartFinanceDbContext _db = null!;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _categoryId = Guid.NewGuid();
    private readonly Guid _accountId = Guid.NewGuid();

    protected abstract Task<SmartFinanceDbContext> CreateContextAsync();

    public virtual async Task InitializeAsync()
    {
        _db = await CreateContextAsync();

        _db.Users.Add(new User { Id = _userId, Email = "money@test.com", PasswordHash = "x", FirstName = "M", LastName = "T" });
        _db.Accounts.Add(new Account { Id = _accountId, UserId = _userId, Name = "Conta", Currency = "BRL" });
        _db.Categories.Add(new Category { Id = _categoryId, UserId = _userId, Name = "Mercado", Type = CategoryType.Expense });
        await _db.SaveChangesAsync();
    }

    public virtual async Task DisposeAsync()
    {
        await _db.DisposeAsync();
    }

    private void AddExpenses(params decimal[] amounts)
    {
        foreach (var amount in amounts)
        {
            _db.Transactions.Add(new Transaction
            {
                UserId = _userId,
                AccountId = _accountId,
                CategoryId = _categoryId,
                Amount = amount,
                Type = TransactionType.Expense,
                Description = "gasto",
                TransactionDate = new DateTime(2026, 5, 10, 0, 0, 0, DateTimeKind.Utc)
            });
        }
    }

    [Fact]
    public async Task CategoryStats_SumsAndAveragesInDecimal()
    {
        // 0.1 + 0.2 + 0.3 somados em double resultariam em 0.6000000000000001.
        AddExpenses(0.10m, 0.20m, 0.30m);
        await _db.SaveChangesAsync();

        var service = new CategoryService(_db, NullLogger<CategoryService>.Instance);
        var stats = await service.GetCategoryStatsAsync(_userId, _categoryId);

        stats.Should().NotBeNull();
        stats!.TotalTransactions.Should().Be(3);
        stats.TotalAmount.Should().Be(0.60m);
        stats.AverageAmount.Should().Be(0.20m);
    }

    [Fact]
    public async Task CategoryStats_AverageIsRoundedToCents()
    {
        AddExpenses(10.00m, 0.01m, 0.01m); // 10.02 / 3 = 3.34
        await _db.SaveChangesAsync();

        var service = new CategoryService(_db, NullLogger<CategoryService>.Instance);
        var stats = await service.GetCategoryStatsAsync(_userId, _categoryId);

        stats!.TotalAmount.Should().Be(10.02m);
        stats.AverageAmount.Should().Be(3.34m);
    }

    [Fact]
    public async Task BudgetSpent_SumsInDecimal_AndPercentageIsRounded()
    {
        AddExpenses(Enumerable.Repeat(0.10m, 30).ToArray()); // 3.00 exato
        _db.Budgets.Add(new Budget
        {
            UserId = _userId,
            CategoryId = _categoryId,
            Name = "Mercado",
            Amount = 9.00m,
            Period = BudgetPeriod.Monthly,
            StartDate = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(2026, 5, 31, 0, 0, 0, DateTimeKind.Utc)
        });
        await _db.SaveChangesAsync();
        var budgetId = await _db.Budgets.Select(b => b.Id).SingleAsync();

        var service = new BudgetService(_db, NullLogger<BudgetService>.Instance);
        var budget = await service.GetBudgetAsync(_userId, budgetId);

        budget.Should().NotBeNull();
        budget!.Spent.Should().Be(3.00m);
        budget.Remaining.Should().Be(6.00m);
        budget.Percentage.Should().Be(33.33m);
    }

    [Fact]
    public async Task CategoryList_TotalAmountPerCategoryIsExact()
    {
        AddExpenses(0.10m, 0.20m, 19.99m, 0.01m);
        await _db.SaveChangesAsync();

        var service = new CategoryService(_db, NullLogger<CategoryService>.Instance);
        var page = await service.GetCategoriesAsync(_userId, 1, 50, null, null, "name", "asc", string.Empty);

        var category = page.Items.Single(c => c.Id == _categoryId.ToString());
        category.TransactionCount.Should().Be(4);
        category.TotalAmount.Should().Be(20.30m);
    }
}

public class MoneyAggregationSqliteTests : MoneyAggregationTestsBase
{
    private SqliteConnection _connection = null!;

    protected override async Task<SmartFinanceDbContext> CreateContextAsync()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        await _connection.OpenAsync();
        var options = new DbContextOptionsBuilder<SmartFinanceDbContext>()
            .UseSqlite(_connection)
            .Options;
        var db = new SmartFinanceDbContext(options);
        await db.Database.EnsureCreatedAsync();
        return db;
    }

    public override async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _connection.DisposeAsync();
    }
}

public class MoneyAggregationInMemoryProviderTests : MoneyAggregationTestsBase
{
    protected override Task<SmartFinanceDbContext> CreateContextAsync()
    {
        var options = new DbContextOptionsBuilder<SmartFinanceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return Task.FromResult(new SmartFinanceDbContext(options));
    }
}
