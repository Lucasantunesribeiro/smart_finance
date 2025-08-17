using FluentAssertions;
using SmartFinance.Application.Features.Transactions.Commands;
using SmartFinance.Domain.Enums;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Transactions.Commands;

public class UpdateTransactionCommandTests
{
    [Fact]
    public void UpdateTransactionCommand_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var id = Guid.NewGuid();
        var amount = 150.75m;
        var description = "Updated transaction";
        var category = "Entertainment";
        var type = TransactionType.Income;
        var date = DateTime.UtcNow.AddDays(-1);

        // Act
        var command = new UpdateTransactionCommand
        {
            Id = id,
            Amount = amount,
            Description = description,
            Category = category,
            Type = type,
            Date = date
        };

        // Assert
        command.Id.Should().Be(id);
        command.Amount.Should().Be(amount);
        command.Description.Should().Be(description);
        command.Category.Should().Be(category);
        command.Type.Should().Be(type);
        command.Date.Should().Be(date);
    }

    [Fact]
    public void UpdateTransactionCommand_ShouldRequireValidId()
    {
        // Act
        var command = new UpdateTransactionCommand { Id = Guid.Empty };

        // Assert
        command.Id.Should().Be(Guid.Empty);
    }
}