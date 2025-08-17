using FluentAssertions;
using SmartFinance.Application.Features.Auth.Commands;
using SmartFinance.Domain.Enums;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Auth.Commands;

public class RegisterCommandTests
{
    [Fact]
    public void RegisterCommand_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var email = "test@example.com";
        var password = "password123";
        var firstName = "John";
        var lastName = "Doe";

        // Act
        var command = new RegisterCommand
        {
            Email = email,
            Password = password,
            FirstName = firstName,
            LastName = lastName
        };

        // Assert
        command.Email.Should().Be(email);
        command.Password.Should().Be(password);
        command.FirstName.Should().Be(firstName);
        command.LastName.Should().Be(lastName);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void RegisterCommand_ShouldAllowEmptyFields_ForValidationTesting(string value)
    {
        // Act
        var command = new RegisterCommand
        {
            Email = value,
            Password = value,
            FirstName = value,
            LastName = value
        };

        // Assert
        command.Email.Should().Be(value);
        command.Password.Should().Be(value);
        command.FirstName.Should().Be(value);
        command.LastName.Should().Be(value);
    }
}