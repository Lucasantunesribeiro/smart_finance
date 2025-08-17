using FluentAssertions;
using SmartFinance.Application.Features.Auth.Commands;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Auth.Commands;

public class RefreshTokenCommandTests
{
    [Fact]
    public void RefreshTokenCommand_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var refreshToken = "refresh-token-123";

        // Act
        var command = new RefreshTokenCommand
        {
            RefreshToken = refreshToken
        };

        // Assert
        command.RefreshToken.Should().Be(refreshToken);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void RefreshTokenCommand_ShouldAllowEmptyRefreshToken_ForValidationTesting(string refreshToken)
    {
        // Act
        var command = new RefreshTokenCommand { RefreshToken = refreshToken };

        // Assert
        command.RefreshToken.Should().Be(refreshToken);
    }
}