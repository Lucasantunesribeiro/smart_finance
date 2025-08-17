using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartFinance.Infrastructure.Data;

namespace SmartFinance.Tests.Application.Common;

public abstract class TestBase : IDisposable
{
    protected readonly SmartFinanceDbContext Context;
    protected readonly IServiceProvider ServiceProvider;

    protected TestBase()
    {
        var services = new ServiceCollection();
        services.AddTestServices();
        
        ServiceProvider = services.BuildServiceProvider();
        Context = ServiceProvider.GetRequiredService<SmartFinanceDbContext>();
    }

    protected async Task SeedDataAsync()
    {
        // Override in derived classes to seed test data
        await Task.CompletedTask;
    }

    protected async Task<T> ExecuteDbContextAsync<T>(Func<SmartFinanceDbContext, Task<T>> action)
    {
        using var context = TestConfiguration.CreateInMemoryContext();
        return await action(context);
    }

    protected async Task ExecuteDbContextAsync(Func<SmartFinanceDbContext, Task> action)
    {
        using var context = TestConfiguration.CreateInMemoryContext();
        await action(context);
    }

    public void Dispose()
    {
        Context?.Dispose();
        ServiceProvider?.GetService<IServiceScope>()?.Dispose();
    }
}