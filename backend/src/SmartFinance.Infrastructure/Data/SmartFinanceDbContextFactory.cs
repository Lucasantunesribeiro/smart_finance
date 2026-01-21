using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;

namespace SmartFinance.Infrastructure.Data;

public class SmartFinanceDbContextFactory : IDesignTimeDbContextFactory<SmartFinanceDbContext>
{
    public SmartFinanceDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<SmartFinanceDbContext>();
        var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");

        if (!string.IsNullOrWhiteSpace(databaseUrl))
        {
            var useSsl = string.Equals(Environment.GetEnvironmentVariable("DB_SSL"), "true", StringComparison.OrdinalIgnoreCase);
            var connectionString = BuildPostgresConnectionString(databaseUrl, useSsl);
            optionsBuilder.UseNpgsql(connectionString);
        }
        else
        {
            var connectionString = Environment.GetEnvironmentVariable("DEFAULT_CONNECTION") ?? "Data Source=smartfinance.db";
            optionsBuilder.UseSqlite(connectionString);
        }

        return new SmartFinanceDbContext(optionsBuilder.Options);
    }

    private static string BuildPostgresConnectionString(string databaseUrl, bool useSsl)
    {
        var uri = new Uri(databaseUrl);
        var userInfoParts = uri.UserInfo.Split(':', 2, StringSplitOptions.RemoveEmptyEntries);
        var username = userInfoParts.Length > 0 ? Uri.UnescapeDataString(userInfoParts[0]) : string.Empty;
        var password = userInfoParts.Length > 1 ? Uri.UnescapeDataString(userInfoParts[1]) : string.Empty;

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = username,
            Password = password,
            SslMode = useSsl ? SslMode.Require : SslMode.Disable
        };

        return builder.ConnectionString;
    }
}
