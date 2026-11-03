using MoneyRules = SmartFinance.Domain.Common.Money;
using System.Text.Json;
using FluentAssertions;
using SmartFinance.Application.Common.DTOs;
using Xunit;

namespace SmartFinance.Tests.Financial;

/// <summary>
/// A API e o outbox usam System.Text.Json (JsonSerializerDefaults.Web / camelCase).
/// decimal deve ir e voltar do JSON sem passar por double.
/// </summary>
public class MoneyJsonSerializationTests
{
    private static readonly JsonSerializerOptions WebOptions = new(JsonSerializerDefaults.Web);

    [Theory]
    [InlineData("9999999999999999.99")] // máximo de numeric(18,2): double só tem ~15-17 dígitos
    [InlineData("0.30")]
    [InlineData("0.01")]
    [InlineData("1234567.89")]
    public void IntegrationEvent_Amount_RoundTripsWithoutLoss(string raw)
    {
        var amount = decimal.Parse(raw, System.Globalization.CultureInfo.InvariantCulture);
        var evt = new TransactionCreatedIntegrationEvent { Amount = amount };

        var json = JsonSerializer.Serialize(evt, WebOptions);
        var back = JsonSerializer.Deserialize<TransactionCreatedIntegrationEvent>(json, WebOptions)!;

        json.Should().Contain($"\"amount\":{raw}");
        back.Amount.Should().Be(amount);
    }

    [Fact]
    public void Double_CannotRepresentMaxColumnValue()
    {
        // Documenta por que dinheiro não pode ser double.
        ((decimal)9999999999999999.99d).Should().NotBe(9999999999999999.99m);
    }

    [Fact]
    public void CreateTransactionDto_DeserializesFloatArtifactExactly()
    {
        // Um cliente JS que somou 0.1 + 0.2 envia 0.30000000000000004; o backend recebe
        // o literal exato em decimal e depois arredonda explicitamente para centavos.
        const string json = "{\"amount\":0.30000000000000004,\"description\":\"x\"}";

        var dto = JsonSerializer.Deserialize<CreateTransactionDto>(json, WebOptions)!;

        dto.Amount.Should().Be(0.30000000000000004m);
        MoneyRules.Round(dto.Amount).Should().Be(0.30m);
    }

    [Fact]
    public void TransactionSummary_SerializesDecimalsAsJsonNumbers()
    {
        var summary = new TransactionSummaryDto
        {
            TotalIncome = 0.1m + 0.2m,
            TotalExpense = 0.3m,
            NetAmount = 0.1m + 0.2m - 0.3m
        };

        var json = JsonSerializer.Serialize(summary, WebOptions);

        json.Should().Contain("\"totalIncome\":0.3,");
        json.Should().Contain("\"netAmount\":0.0,");
    }
}
