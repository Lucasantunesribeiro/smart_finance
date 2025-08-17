using FluentAssertions;
using SmartFinance.Domain.Common;
using Xunit;

namespace SmartFinance.Tests.Common;

// Test implementation of BaseEntity for testing purposes
public class TestEntity : BaseEntity
{
    public string Name { get; set; } = string.Empty;
}

// Test implementation of BaseAuditableEntity for testing purposes
public class TestAuditableEntity : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
}

public class BaseEntityTests
{
    [Fact]
    public void BaseEntity_ShouldInitializeWithDefaultValues()
    {
        // Act
        var entity = new TestEntity();

        // Assert
        entity.Id.Should().NotBeEmpty();
        entity.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        entity.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        entity.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public void BaseEntity_ShouldGenerateUniqueIds()
    {
        // Act
        var entity1 = new TestEntity();
        var entity2 = new TestEntity();

        // Assert
        entity1.Id.Should().NotBe(entity2.Id);
    }

    [Fact]
    public void BaseEntity_ShouldAllowPropertyModification()
    {
        // Arrange
        var entity = new TestEntity();
        var newId = Guid.NewGuid();
        var newCreatedAt = DateTime.UtcNow.AddDays(-1);
        var newUpdatedAt = DateTime.UtcNow.AddHours(-1);

        // Act
        entity.Id = newId;
        entity.CreatedAt = newCreatedAt;
        entity.UpdatedAt = newUpdatedAt;
        entity.IsDeleted = true;

        // Assert
        entity.Id.Should().Be(newId);
        entity.CreatedAt.Should().Be(newCreatedAt);
        entity.UpdatedAt.Should().Be(newUpdatedAt);
        entity.IsDeleted.Should().BeTrue();
    }
}

public class BaseAuditableEntityTests
{
    [Fact]
    public void BaseAuditableEntity_ShouldInitializeWithDefaultValues()
    {
        // Act
        var entity = new TestAuditableEntity();

        // Assert
        entity.Id.Should().NotBeEmpty();
        entity.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        entity.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        entity.IsDeleted.Should().BeFalse();
        entity.CreatedBy.Should().BeEmpty();
        entity.UpdatedBy.Should().BeEmpty();
    }

    [Fact]
    public void BaseAuditableEntity_ShouldInheritFromBaseEntity()
    {
        // Act
        var entity = new TestAuditableEntity();

        // Assert
        entity.Should().BeAssignableTo<BaseEntity>();
    }

    [Fact]
    public void BaseAuditableEntity_ShouldAllowAuditPropertyModification()
    {
        // Arrange
        var entity = new TestAuditableEntity();
        var createdBy = "user1@example.com";
        var updatedBy = "user2@example.com";

        // Act
        entity.CreatedBy = createdBy;
        entity.UpdatedBy = updatedBy;

        // Assert
        entity.CreatedBy.Should().Be(createdBy);
        entity.UpdatedBy.Should().Be(updatedBy);
    }
}