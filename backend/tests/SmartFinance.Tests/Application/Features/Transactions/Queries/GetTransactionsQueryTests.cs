using FluentAssertions;
using SmartFinance.Application.Features.Transactions.Queries;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Transactions.Queries;

public class GetTransactionsQueryTests
{
    [Fact]
    public void GetTransactionsQuery_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var page = 1;
        var pageSize = 10;
        var search = "Food";
        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var query = new GetTransactionsQuery
        {
            UserId = userId,
            AccountId = accountId,
            Page = page,
            PageSize = pageSize,
            Search = search,
            FromDate = fromDate,
            ToDate = toDate
        };

        // Assert
        query.UserId.Should().Be(userId);
        query.AccountId.Should().Be(accountId);
        query.Page.Should().Be(page);
        query.PageSize.Should().Be(pageSize);
        query.Search.Should().Be(search);
        query.FromDate.Should().Be(fromDate);
        query.ToDate.Should().Be(toDate);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(1)]
    [InlineData(100)]
    public void GetTransactionsQuery_ShouldAllowVariousPageNumbers_ForValidationTesting(int page)
    {
        // Act
        var query = new GetTransactionsQuery { Page = page };

        // Assert
        query.Page.Should().Be(page);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(1)]
    [InlineData(1000)]
    public void GetTransactionsQuery_ShouldAllowVariousPageSizes_ForValidationTesting(int pageSize)
    {
        // Act
        var query = new GetTransactionsQuery { PageSize = pageSize };

        // Assert
        query.PageSize.Should().Be(pageSize);
    }
}