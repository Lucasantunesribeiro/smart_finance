using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Tests.Common;

public static class TestDataFactory
{
    public static User CreateUser(
        string email = "test@example.com",
        string firstName = "John",
        string lastName = "Doe",
        UserRole role = UserRole.User,
        bool isActive = true)
    {
        return new User
        {
            Email = email,
            PasswordHash = "hashedpassword123",
            FirstName = firstName,
            LastName = lastName,
            Role = role,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static Account CreateAccount(
        string name = "Test Account",
        AccountType type = AccountType.Checking,
        decimal balance = 1000.00m,
        User? user = null)
    {
        return new Account
        {
            Name = name,
            Type = type,
            Balance = balance,
            User = user ?? CreateUser(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static Transaction CreateTransaction(
        decimal amount = 100.00m,
        string description = "Test Transaction",
        Category? category = null,
        TransactionType type = TransactionType.Expense,
        DateTime? date = null,
        Account? account = null,
        User? user = null)
    {
        var testUser = user ?? CreateUser();
        var testAccount = account ?? CreateAccount(user: testUser);

        return new Transaction
        {
            Amount = amount,
            Description = description,
            Category = category,
            Type = type,
            TransactionDate = date ?? DateTime.UtcNow,
            Account = testAccount,
            User = testUser,
            AccountId = testAccount.Id,
            UserId = testUser.Id,
            CategoryId = category?.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static Budget CreateBudget(
        string name = "Test Budget",
        Category? category = null,
        decimal amount = 500.00m,
        BudgetPeriod period = BudgetPeriod.Monthly,
        DateTime? startDate = null,
        DateTime? endDate = null,
        User? user = null)
    {
        var testUser = user ?? CreateUser();
        var start = startDate ?? DateTime.UtcNow.Date;
        var end = endDate ?? start.AddMonths(1);

        return new Budget
        {
            Name = name,
            Category = category,
            Amount = amount,
            Period = period,
            StartDate = start,
            EndDate = end,
            User = testUser,
            UserId = testUser.Id,
            CategoryId = category?.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static Report CreateReport(
        string name = "Test Report",
        ReportType type = ReportType.IncomeStatement,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        User? user = null)
    {
        var testUser = user ?? CreateUser();
        var start = fromDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = toDate ?? DateTime.UtcNow;

        return new Report
        {
            Name = name,
            Type = type,
            FromDate = start,
            ToDate = end,
            Parameters = "{}",
            User = testUser,
            UserId = testUser.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static List<User> CreateUsers(int count)
    {
        var users = new List<User>();
        for (int i = 0; i < count; i++)
        {
            users.Add(CreateUser(
                email: $"user{i}@example.com",
                firstName: $"User{i}",
                lastName: $"Test{i}"
            ));
        }
        return users;
    }

    public static List<Transaction> CreateTransactions(int count, Account? account = null, User? user = null)
    {
        var transactions = new List<Transaction>();
        var testUser = user ?? CreateUser();
        var testAccount = account ?? CreateAccount(user: testUser);

        for (int i = 0; i < count; i++)
        {
            transactions.Add(CreateTransaction(
                amount: (i + 1) * 10.00m,
                description: $"Transaction {i + 1}",
                category: null, // No category for simplicity
                type: i % 2 == 0 ? TransactionType.Expense : TransactionType.Income,
                date: DateTime.UtcNow.AddDays(-i),
                account: testAccount,
                user: testUser
            ));
        }
        return transactions;
    }
}