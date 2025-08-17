using FluentAssertions;
using SmartFinance.Application.Features.Transactions.Commands;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Transactions.Commands;

public class DeleteTransactionCommandTests
{
    [Fact]
    public void DeleteTransactionCommand_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var id = Guid.NewGuid();

        // Act
        var command = new DeleteTransactionCommand { Id = id };

        // Assert
        command.Id.Should().Be(id);
    }

    [Fact]
    public void DeleteTransactionCommand_ShouldAllowEmptyId_ForValidationTesting()
    {
        // Act
        var command = new DeleteTransactionCommand { Id = Guid.Empty };

        // Assert
        command.Id.Should().Be(Guid.Empty);
    }
}