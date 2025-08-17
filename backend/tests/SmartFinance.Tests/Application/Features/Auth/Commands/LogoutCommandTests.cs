using FluentAssertions;
using SmartFinance.Application.Features.Auth.Commands;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Auth.Commands;

public class LogoutCommandTests
{
    [Fact]
    public void LogoutCommand_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = "jwt-token-123";

        // Act
        var command = new LogoutCommand
        {
            UserId = userId,
            Token = token
        };

        // Assert
        command.UserId.Should().Be(userId);
        command.Token.Should().Be(token);
    }

    [Fact]
    public void LogoutCommand_ShouldAllowEmptyToken_ForValidationTesting()
    {
        // Act
        var command = new LogoutCommand { Token = "" };

        // Assert
        command.Token.Should().Be("");
    }
}