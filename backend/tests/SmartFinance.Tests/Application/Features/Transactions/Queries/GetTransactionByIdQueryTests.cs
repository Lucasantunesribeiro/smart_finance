using FluentAssertions;
using SmartFinance.Application.Features.Transactions.Queries;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Transactions.Queries;

public class GetTransactionByIdQueryTests
{
    [Fact]
    public void GetTransactionByIdQuery_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var id = Guid.NewGuid();

        // Act
        var query = new GetTransactionByIdQuery { Id = id };

        // Assert
        query.Id.Should().Be(id);
    }

    [Fact]
    public void GetTransactionByIdQuery_ShouldAllowEmptyId_ForValidationTesting()
    {
        // Act
        var query = new GetTransactionByIdQuery { Id = Guid.Empty };

        // Assert
        query.Id.Should().Be(Guid.Empty);
    }
}