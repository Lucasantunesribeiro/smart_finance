using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Infrastructure.Data;

/// <summary>
/// Configuração do usuário de demonstração, lida de variáveis de ambiente.
/// O seed só roda com <c>DEMO_SEED=true</c> e a senha nunca fica no código:
/// vem de <c>DEMO_USER_PASSWORD</c>.
/// </summary>
public sealed record DemoSeedOptions(bool Enabled, string Email, string? Password)
{
    public const string DefaultEmail = "test@smartfinance.com";
    public const int MinimumPasswordLength = 8;

    public static DemoSeedOptions FromEnvironment(Func<string, string?> getVariable)
    {
        var enabled = string.Equals(getVariable("DEMO_SEED")?.Trim(), "true", StringComparison.OrdinalIgnoreCase);
        var email = getVariable("DEMO_USER_EMAIL");
        var password = getVariable("DEMO_USER_PASSWORD");

        return new DemoSeedOptions(
            enabled,
            string.IsNullOrWhiteSpace(email) ? DefaultEmail : email.Trim().ToLowerInvariant(),
            string.IsNullOrEmpty(password) ? null : password);
    }
}

public enum DemoSeedOutcome
{
    Disabled,
    MissingPassword,
    Seeded
}

/// <summary>
/// Cria (ou atualiza) o usuário de demonstração com contas, transações e orçamentos de exemplo.
/// Idempotente: só insere dados de exemplo quando o usuário ainda não tem contas, transações
/// ou orçamentos, e só troca o hash da senha quando ela não confere com <c>DEMO_USER_PASSWORD</c>.
/// </summary>
public sealed class DemoDataSeeder
{
    // Categorias globais criadas pelo HasData do SmartFinanceDbContext.
    private static readonly Guid FoodCategoryId = Guid.Parse("11111111-1111-1111-1111-111111111001");
    private static readonly Guid TransportCategoryId = Guid.Parse("11111111-1111-1111-1111-111111111002");
    private static readonly Guid LeisureCategoryId = Guid.Parse("11111111-1111-1111-1111-111111111003");
    private static readonly Guid SalaryCategoryId = Guid.Parse("11111111-1111-1111-1111-111111111004");
    private static readonly Guid OtherCategoryId = Guid.Parse("11111111-1111-1111-1111-111111111005");

    private const string SeedActor = "demo-seed";

    private readonly SmartFinanceDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger _logger;
    private readonly Func<DateTime> _utcNow;

    public DemoDataSeeder(
        SmartFinanceDbContext context,
        IPasswordHasher passwordHasher,
        ILogger logger,
        Func<DateTime>? utcNow = null)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
        _utcNow = utcNow ?? (() => DateTime.UtcNow);
    }

    public async Task<DemoSeedOutcome> SeedAsync(DemoSeedOptions options, CancellationToken cancellationToken = default)
    {
        if (!options.Enabled)
        {
            return DemoSeedOutcome.Disabled;
        }

        if (string.IsNullOrEmpty(options.Password) || options.Password.Length < DemoSeedOptions.MinimumPasswordLength)
        {
            _logger.LogWarning(
                "DEMO_SEED=true, mas DEMO_USER_PASSWORD está ausente ou tem menos de {MinLength} caracteres. Seed de demonstração ignorado.",
                DemoSeedOptions.MinimumPasswordLength);
            return DemoSeedOutcome.MissingPassword;
        }

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == options.Email, cancellationToken);

        if (user is null)
        {
            user = new User
            {
                Email = options.Email,
                FirstName = "Demo",
                LastName = "SmartFinance",
                Role = UserRole.User,
                IsActive = true,
                CreatedBy = SeedActor,
                UpdatedBy = SeedActor,
                PasswordHash = _passwordHasher.HashPassword(options.Password)
            };
            _context.Users.Add(user);
            _logger.LogInformation("Usuário de demonstração criado ({Email}).", options.Email);
        }
        else
        {
            if (!_passwordHasher.VerifyPassword(options.Password, user.PasswordHash))
            {
                user.PasswordHash = _passwordHasher.HashPassword(options.Password);
                user.RefreshToken = null;
                user.RefreshTokenExpiry = null;
                _logger.LogInformation("Senha do usuário de demonstração atualizada a partir de DEMO_USER_PASSWORD.");
            }

            user.IsActive = true;
            user.IsDeleted = false;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var accounts = await _context.Accounts
            .Where(a => a.UserId == user.Id)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        if (accounts.Count == 0)
        {
            accounts = CreateAccounts(user.Id);
            _context.Accounts.AddRange(accounts);
        }

        var hasTransactions = await _context.Transactions.AnyAsync(t => t.UserId == user.Id, cancellationToken);
        if (!hasTransactions)
        {
            var checking = accounts.FirstOrDefault(a => a.Type == AccountType.Checking) ?? accounts[0];
            var savings = accounts.FirstOrDefault(a => a.Id != checking.Id) ?? checking;
            _context.Transactions.AddRange(CreateTransactions(user.Id, checking, savings));
        }

        var hasBudgets = await _context.Budgets.AnyAsync(b => b.UserId == user.Id, cancellationToken);
        if (!hasBudgets)
        {
            _context.Budgets.AddRange(CreateBudgets(user.Id));
        }

        await _context.SaveChangesAsync(cancellationToken);
        return DemoSeedOutcome.Seeded;
    }

    private static List<Account> CreateAccounts(Guid userId) => new()
    {
        new Account
        {
            Name = "Conta corrente",
            Description = "Conta de demonstração",
            Type = AccountType.Checking,
            Currency = "BRL",
            Balance = 0m,
            UserId = userId,
            CreatedBy = SeedActor,
            UpdatedBy = SeedActor
        },
        new Account
        {
            Name = "Poupança",
            Description = "Reserva de emergência",
            Type = AccountType.Savings,
            Currency = "BRL",
            Balance = 0m,
            UserId = userId,
            CreatedBy = SeedActor,
            UpdatedBy = SeedActor
        }
    };

    private IEnumerable<Transaction> CreateTransactions(Guid userId, Account checking, Account savings)
    {
        var today = _utcNow().Date;
        var monthStart = new DateTime(today.Year, today.Month, 1, 12, 0, 0, DateTimeKind.Utc);

        // (mês relativo, dia, descrição, valor, tipo, categoria, conta)
        var rows = new List<(int Month, int Day, string Description, decimal Amount, TransactionType Type, Guid Category, Account Account)>();
        for (var month = -2; month <= 0; month++)
        {
            rows.Add((month, 5, "Salário", 6500.00m, TransactionType.Income, SalaryCategoryId, checking));
            rows.Add((month, 6, "Aporte na poupança", 800.00m, TransactionType.Income, OtherCategoryId, savings));
            rows.Add((month, 8, "Supermercado", 742.35m + (month * -38.10m), TransactionType.Expense, FoodCategoryId, checking));
            rows.Add((month, 12, "Combustível", 289.90m, TransactionType.Expense, TransportCategoryId, checking));
            rows.Add((month, 15, "Restaurante", 156.40m, TransactionType.Expense, FoodCategoryId, checking));
            rows.Add((month, 18, "Transporte por aplicativo", 87.25m, TransactionType.Expense, TransportCategoryId, checking));
            rows.Add((month, 21, "Cinema", 64.00m, TransactionType.Expense, LeisureCategoryId, checking));
            rows.Add((month, 25, "Assinatura de streaming", 39.90m, TransactionType.Expense, LeisureCategoryId, checking));
        }

        foreach (var row in rows)
        {
            var date = monthStart.AddMonths(row.Month).AddDays(row.Day - 1);
            if (date > today.AddDays(1))
            {
                continue; // não cria transações no futuro do mês corrente
            }

            row.Account.ApplyTransaction(row.Type, row.Amount);

            yield return new Transaction
            {
                Amount = row.Amount,
                Description = row.Description,
                TransactionDate = date,
                Type = row.Type,
                Status = TransactionStatus.Completed,
                AccountId = row.Account.Id,
                UserId = userId,
                CategoryId = row.Category,
                CreatedBy = SeedActor,
                UpdatedBy = SeedActor
            };
        }
    }

    private IEnumerable<Budget> CreateBudgets(Guid userId)
    {
        var today = _utcNow().Date;
        var start = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1).AddTicks(-1);

        (string Name, decimal Amount, Guid Category)[] budgets =
        {
            ("Alimentação do mês", 1200.00m, FoodCategoryId),
            ("Transporte do mês", 500.00m, TransportCategoryId),
            ("Lazer do mês", 250.00m, LeisureCategoryId)
        };

        foreach (var (name, amount, category) in budgets)
        {
            yield return new Budget
            {
                Name = name,
                Amount = amount,
                SpentAmount = 0m,
                StartDate = start,
                EndDate = end,
                Period = BudgetPeriod.Monthly,
                IsActive = true,
                UserId = userId,
                CategoryId = category,
                CreatedBy = SeedActor,
                UpdatedBy = SeedActor
            };
        }
    }
}
