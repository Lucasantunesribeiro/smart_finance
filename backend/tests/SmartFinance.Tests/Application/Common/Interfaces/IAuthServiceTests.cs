using FluentAssertions;
using Moq;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using Xunit;

namespace SmartFinance.Tests.Application.Common.Interfaces;

public class IPasswordHasherTests
{
    private readonly Mock<IPasswordHasher> _mockPasswordHasher;

    public IPasswordHasherTests()
    {
        _mockPasswordHasher = new Mock<IPasswordHasher>();
    }

    [Fact]
    public void IPasswordHasher_ShouldHaveHashPasswordMethod()
    {
        // Arrange
        var password = "password123";
        var expectedHash = "hashedpassword123";

        _mockPasswordHasher
            .Setup(x => x.HashPassword(password))
            .Returns(expectedHash);

        // Act
        var result = _mockPasswordHasher.Object.HashPassword(password);

        // Assert
        result.Should().Be(expectedHash);
        _mockPasswordHasher.Verify(x => x.HashPassword(password), Times.Once);
    }

    [Fact]
    public void IPasswordHasher_ShouldHaveVerifyPasswordMethod()
    {
        // Arrange
        var password = "password123";
        var hashedPassword = "hashedpassword123";

        _mockPasswordHasher
            .Setup(x => x.VerifyPassword(password, hashedPassword))
            .Returns(true);

        // Act
        var result = _mockPasswordHasher.Object.VerifyPassword(password, hashedPassword);

        // Assert
        result.Should().BeTrue();
        _mockPasswordHasher.Verify(x => x.VerifyPassword(password, hashedPassword), Times.Once);
    }
}

public class IJwtTokenServiceTests
{
    private readonly Mock<IJwtTokenService> _mockJwtTokenService;

    public IJwtTokenServiceTests()
    {
        _mockJwtTokenService = new Mock<IJwtTokenService>();
    }

    [Fact]
    public void IJwtTokenService_ShouldHaveGenerateTokenMethod()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var role = "User";
        var expectedToken = "jwt-token-123";

        _mockJwtTokenService
            .Setup(x => x.GenerateToken(userId, email, role))
            .Returns(expectedToken);

        // Act
        var result = _mockJwtTokenService.Object.GenerateToken(userId, email, role);

        // Assert
        result.Should().Be(expectedToken);
        _mockJwtTokenService.Verify(x => x.GenerateToken(userId, email, role), Times.Once);
    }

    [Fact]
    public void IJwtTokenService_ShouldHaveGenerateAccessTokenMethod()
    {
        // Arrange
        var user = new User
        {
            Email = "test@example.com",
            FirstName = "John",
            LastName = "Doe",
            Role = UserRole.User
        };
        var expectedToken = "access-token-123";

        _mockJwtTokenService
            .Setup(x => x.GenerateAccessToken(user))
            .Returns(expectedToken);

        // Act
        var result = _mockJwtTokenService.Object.GenerateAccessToken(user);

        // Assert
        result.Should().Be(expectedToken);
        _mockJwtTokenService.Verify(x => x.GenerateAccessToken(user), Times.Once);
    }

    [Fact]
    public void IJwtTokenService_ShouldHaveGenerateRefreshTokenMethod()
    {
        // Arrange
        var expectedRefreshToken = "refresh-token-123";

        _mockJwtTokenService
            .Setup(x => x.GenerateRefreshToken())
            .Returns(expectedRefreshToken);

        // Act
        var result = _mockJwtTokenService.Object.GenerateRefreshToken();

        // Assert
        result.Should().Be(expectedRefreshToken);
        _mockJwtTokenService.Verify(x => x.GenerateRefreshToken(), Times.Once);
    }

    [Fact]
    public void IJwtTokenService_ShouldHaveValidateTokenMethod()
    {
        // Arrange
        var token = "jwt-token-123";

        _mockJwtTokenService
            .Setup(x => x.ValidateToken(token))
            .Returns(true);

        // Act
        var result = _mockJwtTokenService.Object.ValidateToken(token);

        // Assert
        result.Should().BeTrue();
        _mockJwtTokenService.Verify(x => x.ValidateToken(token), Times.Once);
    }

    [Fact]
    public void IJwtTokenService_ShouldHaveGetUserIdFromTokenMethod()
    {
        // Arrange
        var token = "jwt-token-123";
        var expectedUserId = Guid.NewGuid();

        _mockJwtTokenService
            .Setup(x => x.GetUserIdFromToken(token))
            .Returns(expectedUserId);

        // Act
        var result = _mockJwtTokenService.Object.GetUserIdFromToken(token);

        // Assert
        result.Should().Be(expectedUserId);
        _mockJwtTokenService.Verify(x => x.GetUserIdFromToken(token), Times.Once);
    }
}