using FluentAssertions;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Domain.Common;
using Xunit;

namespace SmartFinance.Tests.Domain.Entities;

public class UserTests
{
    [Fact]
    public void User_ShouldInitializeWithDefaultValues()
    {
        // Act
        var user = new User();

        // Assert
        user.Id.Should().NotBeEmpty();
        user.Email.Should().BeEmpty();
        user.PasswordHash.Should().BeEmpty();
        user.FirstName.Should().BeEmpty();
        user.LastName.Should().BeEmpty();
        user.Role.Should().Be(UserRole.User);
        user.IsActive.Should().BeTrue();
        user.LastLoginAt.Should().BeNull();
        user.RefreshToken.Should().BeNull();
        user.RefreshTokenExpiry.Should().BeNull();
        user.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        user.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        user.IsDeleted.Should().BeFalse();
        user.Accounts.Should().NotBeNull().And.BeEmpty();
        user.Transactions.Should().NotBeNull().And.BeEmpty();
        user.Budgets.Should().NotBeNull().And.BeEmpty();
        user.Reports.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public void User_ShouldSetPropertiesCorrectly()
    {
        // Arrange
        var email = "test@example.com";
        var passwordHash = "hashedpassword";
        var firstName = "John";
        var lastName = "Doe";
        var role = UserRole.Admin;
        var lastLogin = DateTime.UtcNow.AddDays(-1);

        // Act
        var user = new User
        {
            Email = email,
            PasswordHash = passwordHash,
            FirstName = firstName,
            LastName = lastName,
            Role = role,
            IsActive = false,
            LastLoginAt = lastLogin
        };

        // Assert
        user.Email.Should().Be(email);
        user.PasswordHash.Should().Be(passwordHash);
        user.FirstName.Should().Be(firstName);
        user.LastName.Should().Be(lastName);
        user.Role.Should().Be(role);
        user.IsActive.Should().BeFalse();
        user.LastLoginAt.Should().Be(lastLogin);
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid-email")]
    [InlineData("@example.com")]
    [InlineData("test@")]
    public void User_ShouldAllowInvalidEmailFormat_ForDomainValidation(string email)
    {
        // Note: Email validation should be handled at the application layer, not domain
        // Act
        var user = new User { Email = email };

        // Assert
        user.Email.Should().Be(email);
    }

    [Fact]
    public void User_ShouldInheritFromBaseAuditableEntity()
    {
        // Act
        var user = new User();

        // Assert
        user.Should().BeAssignableTo<BaseAuditableEntity>();
        user.CreatedBy.Should().BeEmpty();
        user.UpdatedBy.Should().BeEmpty();
    }
}