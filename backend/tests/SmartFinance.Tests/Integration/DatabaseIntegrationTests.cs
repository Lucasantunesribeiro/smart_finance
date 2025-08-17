using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Tests.Application.Common;
using Xunit;

namespace SmartFinance.Tests.Integration;

public class DatabaseIntegrationTests : TestBase
{
    [Fact]
    public async Task Database_ShouldCreateAndRetrieveUser()
    {
        // Arrange
        using var context = TestConfiguration.CreateInMemoryContext();
        await context.Database.EnsureCreatedAsync();

        var user = new User
        {
            Email = "test@example.com",
            PasswordHash = "hashedpassword",
            FirstName = "John",
            LastName = "Doe",
            Role = UserRole.User,
            CreatedBy = "test",
            UpdatedBy = "test"
        };

        // Act
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Assert
        var retrievedUser = await context.Users.FirstOrDefaultAsync(u => u.Email == user.Email);

        retrievedUser.Should().NotBeNull();
        retrievedUser!.Email.Should().Be(user.Email);
        retrievedUser.FirstName.Should().Be(user.FirstName);
        retrievedUser.LastName.Should().Be(user.LastName);
        retrievedUser.Role.Should().Be(user.Role);
    }

    [Fact]
    public async Task Database_ShouldCreateUserWithAccount()
    {
        // Arrange
        using var context = TestConfiguration.CreateInMemoryContext();
        await context.Database.EnsureCreatedAsync();

        var user = new User
        {
            Email = "test@example.com",
            PasswordHash = "hashedpassword",
            FirstName = "John",
            LastName = "Doe",
            CreatedBy = "test",
            UpdatedBy = "test"
        };

        var account = new Account
        {
            Name = "Checking Account",
            Type = AccountType.Checking,
            Balance = 1000.00m,
            User = user,
            UserId = user.Id,
            CreatedBy = "test",
            UpdatedBy = "test"
        };

        // Act
        context.Users.Add(user);
        context.Accounts.Add(account);
        await context.SaveChangesAsync();

        // Assert
        var retrievedUser = await context.Users
            .Include(u => u.Accounts)
            .FirstOrDefaultAsync(u => u.Email == user.Email);

        retrievedUser.Should().NotBeNull();
        retrievedUser!.Accounts.Should().HaveCount(1);
        retrievedUser.Accounts.First().Name.Should().Be("Checking Account");
        retrievedUser.Accounts.First().Balance.Should().Be(1000.00m);
    }

    [Fact]
    public async Task Database_ShouldCreateTransactionWithAccount()
    {
        // Arrange
        using var context = TestConfiguration.CreateInMemoryContext();
        await context.Database.EnsureCreatedAsync();

        var user = new User
        {
            Email = "test@example.com",
            PasswordHash = "hashedpassword",
            FirstName = "John",
            LastName = "Doe",
            CreatedBy = "test",
            UpdatedBy = "test"
        };

        var account = new Account
        {
            Name = "Checking Account",
            Type = AccountType.Checking,
            Balance = 1000.00m,
            User = user,
            UserId = user.Id,
            CreatedBy = "test",
            UpdatedBy = "test"
        };

        var transaction = new Transaction
        {
            Amount = 50.00m,
            Description = "Grocery shopping",
            Type = TransactionType.Expense,
            TransactionDate = DateTime.UtcNow,
            Account = account,
            User = user,
            AccountId = account.Id,
            UserId = user.Id,
            CreatedBy = "test",
            UpdatedBy = "test"
        };

        // Act
        context.Users.Add(user);
        context.Accounts.Add(account);
        context.Transactions.Add(transaction);
        await context.SaveChangesAsync();

        // Assert
        var retrievedTransaction = await context.Transactions
            .Include(t => t.Account)
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Description == "Grocery shopping");

        retrievedTransaction.Should().NotBeNull();
        retrievedTransaction!.Amount.Should().Be(50.00m);
        retrievedTransaction.Type.Should().Be(TransactionType.Expense);
        retrievedTransaction.Account.Name.Should().Be("Checking Account");
        retrievedTransaction.User.Email.Should().Be("test@example.com");
    }
}