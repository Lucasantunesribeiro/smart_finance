using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace SmartFinance.Infrastructure.Data;

/// <summary>
/// Somas de valores monetários sempre em decimal.
/// PostgreSQL (produção) soma numeric no banco sem perda. O provedor SQLite (desenvolvimento local)
/// não sabe agregar decimal; nesse caso os valores são lidos e somados em memória, também em decimal.
/// Nunca converter para double: isso perde centavos (ex.: 0.1 + 0.2 = 0.30000000000000004).
/// </summary>
internal static class MoneyQueryExtensions
{
    public static async Task<decimal> SumMoneyAsync<T>(
        this IQueryable<T> query,
        DbContext context,
        Expression<Func<T, decimal>> selector,
        CancellationToken cancellationToken = default)
    {
        if (context.Database.IsSqlite())
        {
            var values = await query.Select(selector).ToListAsync(cancellationToken);
            return values.Sum();
        }

        return await query.SumAsync(selector, cancellationToken);
    }
}
