using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartFinance.Infrastructure.Data;

namespace SmartFinance.Tests;

public static class TestConfiguration
{
    public static IServiceCollection AddTestServices(this IServiceCollection services)
    {
        // Add in-memory database for testing
        services.AddDbContext<SmartFinanceDbContext>(options =>
            options.UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()));

        return services;
    }

    public static SmartFinanceDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<SmartFinanceDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SmartFinanceDbContext(options);
    }
}