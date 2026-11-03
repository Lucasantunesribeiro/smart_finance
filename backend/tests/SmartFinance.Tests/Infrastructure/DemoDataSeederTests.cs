using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;
using SmartFinance.Infrastructure.Services;
using Xunit;

namespace SmartFinance.Tests.Infrastructure;

/// <summary>
/// O usuário de demonstração só pode existir quando DEMO_SEED=true, com a senha vinda do ambiente.
/// Roda em SQLite em memória com EnsureCreated (mesmo caminho do modo local da API).
/// </summary>
public class DemoDataSeederTests : IAsyncLifetime
{
    private static readonly DateTime FixedNow = new(2026, 11, 20, 15, 0, 0, DateTimeKind.Utc);

    private SqliteConnection _connection = null!;
    private SmartFinanceDbContext _db = null!;
    private readonly PasswordHasher _hasher = new();

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        await _connection.OpenAsync();
        var options = new DbContextOptionsBuilder<SmartFinanceDbContext>().UseSqlite(_connection).Options;
        _db = new SmartFinanceDbContext(options);
        await _db.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private DemoDataSeeder CreateSeeder() => new(_db, _hasher, NullLogger.Instance, () => FixedNow);

    private static DemoSeedOptions Options(Dictionary<string, string?> env) =>
        DemoSeedOptions.FromEnvironment(name => env.TryGetValue(name, out var value) ? value : null);

    [Fact]
    public async Task Model_NoLongerSeedsAnyUserOrAccount()
    {
        (await _db.Users.IgnoreQueryFilters().CountAsync()).Should().Be(0);
        (await _db.Accounts.IgnoreQueryFilters().CountAsync()).Should().Be(0);
        (await _db.Categories.CountAsync()).Should().Be(5, "as categorias globais continuam no HasData");
    }

    [Fact]
    public async Task Seed_WithoutDemoSeedFlag_DoesNothing()
    {
        var outcome = await CreateSeeder().SeedAsync(Options(new() { ["DEMO_USER_PASSWORD"] = "Senha-Forte-123" }));

        outcome.Should().Be(DemoSeedOutcome.Disabled);
        (await _db.Users.CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("curta")]
    public async Task Seed_WithFlagButWithoutValidPassword_DoesNotCreateUser(string? password)
    {
        var outcome = await CreateSeeder().SeedAsync(Options(new() { ["DEMO_SEED"] = "true", ["DEMO_USER_PASSWORD"] = password }));

        outcome.Should().Be(DemoSeedOutcome.MissingPassword);
        (await _db.Users.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Seed_CreatesUserWithPasswordFromEnvironment_AndConsistentBalances()
    {
        var outcome = await CreateSeeder().SeedAsync(Options(new()
        {
            ["DEMO_SEED"] = "TRUE",
            ["DEMO_USER_EMAIL"] = "Demo@Example.com",
            ["DEMO_USER_PASSWORD"] = "Senha-Forte-123"
        }));

        outcome.Should().Be(DemoSeedOutcome.Seeded);

        var user = await _db.Users.SingleAsync();
        user.Email.Should().Be("demo@example.com");
        _hasher.VerifyPassword("Senha-Forte-123", user.PasswordHash).Should().BeTrue();

        var accounts = await _db.Accounts.Where(a => a.UserId == user.Id).ToListAsync();
        accounts.Should().HaveCount(2);

        var transactions = await _db.Transactions.Where(t => t.UserId == user.Id).ToListAsync();
        transactions.Should().NotBeEmpty();
        transactions.Should().OnlyContain(t => t.TransactionDate <= FixedNow.Date.AddDays(1));
        transactions.Should().OnlyContain(t => t.Status == TransactionStatus.Completed);

        // O saldo de cada conta é exatamente receitas - despesas das suas transações.
        foreach (var account in accounts)
        {
            var expected = transactions
                .Where(t => t.AccountId == account.Id)
                .Sum(t => t.Type == TransactionType.Income ? t.Amount : -t.Amount);
            account.Balance.Should().Be(expected);
        }

        (await _db.Budgets.CountAsync(b => b.UserId == user.Id)).Should().Be(3);
    }

    [Fact]
    public async Task Seed_IsIdempotent_AndRotatesPasswordWhenEnvironmentChanges()
    {
        var first = Options(new() { ["DEMO_SEED"] = "true", ["DEMO_USER_PASSWORD"] = "Primeira-Senha-1" });
        await CreateSeeder().SeedAsync(first);
        var transactionCount = await _db.Transactions.CountAsync();
        var accountCount = await _db.Accounts.CountAsync();

        var rotated = Options(new() { ["DEMO_SEED"] = "true", ["DEMO_USER_PASSWORD"] = "Segunda-Senha-2" });
        await CreateSeeder().SeedAsync(rotated);

        (await _db.Users.CountAsync()).Should().Be(1);
        (await _db.Transactions.CountAsync()).Should().Be(transactionCount);
        (await _db.Accounts.CountAsync()).Should().Be(accountCount);

        var user = await _db.Users.SingleAsync();
        user.Email.Should().Be(DemoSeedOptions.DefaultEmail);
        _hasher.VerifyPassword("Segunda-Senha-2", user.PasswordHash).Should().BeTrue();
        _hasher.VerifyPassword("Primeira-Senha-1", user.PasswordHash).Should().BeFalse();
    }
}
