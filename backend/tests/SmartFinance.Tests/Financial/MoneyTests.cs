using MoneyRules = SmartFinance.Domain.Common.Money;
using FluentAssertions;
using SmartFinance.Domain.Common;
using Xunit;

namespace SmartFinance.Tests.Financial;

/// <summary>Regras de dinheiro em decimal: soma exata, arredondamento explícito e limites.</summary>
public class MoneyTests
{
    [Fact]
    public void Decimal_SumsThatBreakInDouble_AreExact()
    {
        // Em double, 0.1 + 0.2 = 0.30000000000000004. Em decimal, é exatamente 0.3.
        (0.1d + 0.2d).Should().NotBe(0.3d);
        (0.1m + 0.2m).Should().Be(0.3m);

        var total = Enumerable.Repeat(0.1m, 1000).Sum();
        total.Should().Be(100.0m);
    }

    [Theory]
    [InlineData("0.005", "0.01")]
    [InlineData("-0.005", "-0.01")]
    [InlineData("1.005", "1.01")]  // em double 1.005 vira 1.00499999... e arredondaria para 1.00
    [InlineData("2.675", "2.68")]
    [InlineData("10.994", "10.99")]
    [InlineData("0.125", "0.13")]  // MidpointRounding.ToEven daria 0.12
    public void Round_UsesAwayFromZero(string input, string expected)
    {
        MoneyRules.Round(decimal.Parse(input, System.Globalization.CultureInfo.InvariantCulture))
            .Should().Be(decimal.Parse(expected, System.Globalization.CultureInfo.InvariantCulture));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-0.01")]
    [InlineData("-100")]
    [InlineData("0.004")] // arredonda para 0.00 e deve ser rejeitado
    public void NormalizePositiveAmount_RejectsZeroAndNegative(string input)
    {
        var value = decimal.Parse(input, System.Globalization.CultureInfo.InvariantCulture);

        var act = () => MoneyRules.NormalizePositiveAmount(value);

        act.Should().Throw<ArgumentException>().WithMessage("Amount must be greater than zero");
    }

    [Fact]
    public void NormalizePositiveAmount_RejectsValuesAboveColumnPrecision()
    {
        var act = () => MoneyRules.NormalizePositiveAmount(10_000_000_000_000_000m);

        act.Should().Throw<ArgumentException>().WithMessage("Amount exceeds the maximum supported value");
    }

    [Fact]
    public void NormalizePositiveAmount_RoundsToCents()
    {
        MoneyRules.NormalizePositiveAmount(10.005m).Should().Be(10.01m);
        MoneyRules.NormalizePositiveAmount(MoneyRules.MaxAbsoluteValue)
            .Should().Be(9_999_999_999_999_999.99m);
    }

    [Fact]
    public void Average_RoundsDivisionToCents()
    {
        MoneyRules.Average(10m, 3).Should().Be(3.33m);
        MoneyRules.Average(20m, 3).Should().Be(6.67m);
        MoneyRules.Average(100m, 0).Should().Be(0m);
    }

    [Fact]
    public void Percentage_HandlesZeroTotalAndRounds()
    {
        MoneyRules.Percentage(1m, 3m).Should().Be(33.33m);
        MoneyRules.Percentage(2m, 3m).Should().Be(66.67m);
        MoneyRules.Percentage(50m, 0m).Should().Be(0m);
    }

    [Fact]
    public void PercentageChange_ReturnsZeroWhenPreviousIsZero()
    {
        MoneyRules.PercentageChange(150m, 100m).Should().Be(50m);
        MoneyRules.PercentageChange(100m, 300m).Should().Be(-66.67m);
        MoneyRules.PercentageChange(100m, 0m).Should().Be(0m);
    }
}
