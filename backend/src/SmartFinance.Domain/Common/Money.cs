namespace SmartFinance.Domain.Common;

/// <summary>
/// Regras centrais para valores monetários.
/// Todo valor de dinheiro é <see cref="decimal"/> com 2 casas (coluna numeric(18,2)).
/// O arredondamento é sempre explícito e usa <see cref="MidpointRounding.AwayFromZero"/>,
/// o mesmo comportamento do tipo numeric do PostgreSQL ao gravar valores com mais casas.
/// </summary>
public static class Money
{
    /// <summary>Casas decimais armazenadas para valores monetários.</summary>
    public const int Scale = 2;

    /// <summary>Modo de arredondamento usado em todo cálculo monetário.</summary>
    public const MidpointRounding Rounding = MidpointRounding.AwayFromZero;

    /// <summary>Maior valor absoluto que cabe em numeric(18,2).</summary>
    public const decimal MaxAbsoluteValue = 9_999_999_999_999_999.99m;

    /// <summary>Arredonda um valor para centavos (2 casas, metade para longe do zero).</summary>
    public static decimal Round(decimal value) => Math.Round(value, Scale, Rounding);

    /// <summary>
    /// Normaliza o valor de uma transação/orçamento: arredonda para centavos e exige que seja
    /// maior que zero e dentro do intervalo suportado pelo banco.
    /// </summary>
    /// <exception cref="ArgumentException">Valor zero, negativo ou acima do limite.</exception>
    public static decimal NormalizePositiveAmount(decimal value, string fieldName = "Amount")
    {
        var rounded = Round(value);

        if (rounded <= 0m)
        {
            throw new ArgumentException($"{fieldName} must be greater than zero");
        }

        if (rounded > MaxAbsoluteValue)
        {
            throw new ArgumentException($"{fieldName} exceeds the maximum supported value");
        }

        return rounded;
    }

    /// <summary>
    /// Arredonda para centavos e garante que o valor (positivo ou negativo) cabe em numeric(18,2).
    /// Usado para saldos, que podem ser negativos (cartão de crédito, empréstimo).
    /// </summary>
    /// <exception cref="ArgumentException">Valor fora do intervalo suportado.</exception>
    public static decimal NormalizeSigned(decimal value, string fieldName = "Balance")
    {
        var rounded = Round(value);

        if (Math.Abs(rounded) > MaxAbsoluteValue)
        {
            throw new ArgumentException($"{fieldName} exceeds the maximum supported value");
        }

        return rounded;
    }

    /// <summary>Média arredondada para centavos; retorna 0 quando não há itens.</summary>
    public static decimal Average(decimal total, int count) =>
        count <= 0 ? 0m : Round(total / count);

    /// <summary>
    /// Percentual de <paramref name="part"/> sobre <paramref name="total"/> com 2 casas;
    /// retorna 0 quando o total é zero (evita divisão por zero).
    /// </summary>
    public static decimal Percentage(decimal part, decimal total) =>
        total == 0m ? 0m : Math.Round(part / total * 100m, 2, Rounding);

    /// <summary>
    /// Variação percentual de <paramref name="previous"/> para <paramref name="current"/>;
    /// retorna 0 quando o valor anterior é zero ou negativo.
    /// </summary>
    public static decimal PercentageChange(decimal current, decimal previous) =>
        previous <= 0m ? 0m : Math.Round((current - previous) / previous * 100m, 2, Rounding);
}
