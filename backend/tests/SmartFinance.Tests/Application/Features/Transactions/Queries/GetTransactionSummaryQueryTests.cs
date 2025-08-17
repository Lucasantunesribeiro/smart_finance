using FluentAssertions;
using SmartFinance.Application.Features.Transactions.Queries;
using Xunit;

namespace SmartFinance.Tests.Application.Features.Transactions.Queries;

public class GetTransactionSummaryQueryTests
{
    [Fact]
    public void GetTransactionSummaryQuery_ShouldInitializeWithCorrectProperties()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;
        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var query = new GetTransactionSummaryQuery
        {
            UserId = userId,
            StartDate = startDate,
            EndDate = endDate,
            FromDate = fromDate,
            ToDate = toDate
        };

        // Assert
        query.UserId.Should().Be(userId);
        query.StartDate.Should().Be(startDate);
        query.EndDate.Should().Be(endDate);
        query.FromDate.Should().Be(fromDate);
        query.ToDate.Should().Be(toDate);
    }

    [Fact]
    public void GetTransactionSummaryQuery_ShouldAllowDefaultDates_ForValidationTesting()
    {
        // Act
        var query = new GetTransactionSummaryQuery
        {
            StartDate = default,
            EndDate = default,
            FromDate = default,
            ToDate = default
        };

        // Assert
        query.StartDate.Should().Be(default);
        query.EndDate.Should().Be(default);
        query.FromDate.Should().Be(default);
        query.ToDate.Should().Be(default);
    }
}