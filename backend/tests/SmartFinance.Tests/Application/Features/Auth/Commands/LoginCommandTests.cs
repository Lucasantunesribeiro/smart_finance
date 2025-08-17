using FluentAssertions;
using Moq;
using SmartFinance.Application.Features.Auth.Commands;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Auth.Commands;

public class LoginCommandTests
{
    [Fact]
    public void LoginCommand_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var email = "test@example.com";
        var password = "password123";

        // Act
        var command = new LoginCommand
        {
            Email = email,
            Password = password
        };

        // Assert
        command.Email.Should().Be(email);
        command.Password.Should().Be(password);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void LoginCommand_ShouldAllowEmptyEmail_ForValidationTesting(string email)
    {
        // Act
        var command = new LoginCommand { Email = email };

        // Assert
        command.Email.Should().Be(email);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void LoginCommand_ShouldAllowEmptyPassword_ForValidationTesting(string password)
    {
        // Act
        var command = new LoginCommand { Password = password };

        // Assert
        command.Password.Should().Be(password);
    }
}