using FluentAssertions;
using Microsoft.Extensions.Configuration;
using SmartFinance.Infrastructure.Services;
using Xunit;

namespace SmartFinance.Tests.Infrastructure;

public class JwtTokenServiceConfigurationTests
{
    [Fact]
    public void AcceptsJwtEnvironmentKeys_UsedByDockerCompose()
    {
        // docker-compose.yml e render.yaml definem só JWT_SECRET_KEY / JWT_ISSUER / JWT_AUDIENCE.
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT_SECRET_KEY"] = new string('k', 48),
                ["JWT_ISSUER"] = "SmartFinance",
                ["JWT_AUDIENCE"] = "SmartFinanceUsers"
            })
            .Build();

        var service = new JwtTokenService(configuration);
        var token = service.GenerateToken(Guid.NewGuid(), "demo@example.com", "User");

        token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void PrefersJwtSection_WhenBothArePresent()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "from-section",
                ["JWT_SECRET_KEY"] = "from-env"
            })
            .Build();

        JwtTokenService.ReadSetting(configuration, "Jwt:SecretKey", "JWT_SECRET_KEY").Should().Be("from-section");
        JwtTokenService.ReadSetting(configuration, "Jwt:Missing", "ALSO_MISSING").Should().BeNull();
    }
}
