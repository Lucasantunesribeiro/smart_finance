using Microsoft.EntityFrameworkCore;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Common;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Infrastructure.Data;

public class SmartFinanceDbContext : DbContext
{
    public SmartFinanceDbContext(DbContextOptions<SmartFinanceDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Account> Accounts { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Budget> Budgets { get; set; }
    public DbSet<BudgetAlert> BudgetAlerts { get; set; }
    public DbSet<Report> Reports { get; set; }
    public DbSet<TransactionTag> TransactionTags { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Role).IsRequired();
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            entity.Property(e => e.UpdatedBy).HasMaxLength(100);
            
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Balance).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Currency).HasMaxLength(3).HasDefaultValue("USD");
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            entity.Property(e => e.UpdatedBy).HasMaxLength(100);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Accounts)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).IsRequired().HasColumnType("decimal(18,2)");
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ExternalId).HasMaxLength(100);
            entity.Property(e => e.Reference).HasMaxLength(100);
            entity.Property(e => e.ExchangeRate).HasColumnType("decimal(18,6)");
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.RecurrencePattern).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            entity.Property(e => e.UpdatedBy).HasMaxLength(100);

            entity.HasOne(e => e.Account)
                .WithMany(a => a.Transactions)
                .HasForeignKey(e => e.AccountId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Transactions)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.Category)
                .WithMany(c => c.Transactions)
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.TransactionDate);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Status);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Color).HasMaxLength(7).HasDefaultValue("#000000");
            entity.Property(e => e.Icon).HasMaxLength(50);
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            entity.Property(e => e.UpdatedBy).HasMaxLength(100);

            entity.HasOne(e => e.Parent)
                .WithMany(c => c.Children)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Budget>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Amount).IsRequired().HasColumnType("decimal(18,2)");
            entity.Property(e => e.SpentAmount).HasColumnType("decimal(18,2)").HasDefaultValue(0);
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            entity.Property(e => e.UpdatedBy).HasMaxLength(100);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Budgets)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Category)
                .WithMany(c => c.Budgets)
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<BudgetAlert>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ThresholdPercentage).IsRequired().HasColumnType("decimal(5,2)");

            entity.HasOne(e => e.Budget)
                .WithMany(b => b.Alerts)
                .HasForeignKey(e => e.BudgetId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Parameters).HasMaxLength(2000).HasDefaultValue("{}");
            entity.Property(e => e.FilePath).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            entity.Property(e => e.UpdatedBy).HasMaxLength(100);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Reports)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<TransactionTag>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Color).HasMaxLength(7).HasDefaultValue("#000000");

            entity.HasOne(e => e.Transaction)
                .WithMany(t => t.Tags)
                .HasForeignKey(e => e.TransactionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        SeedData(modelBuilder);
    }

    private void SeedData(ModelBuilder modelBuilder)
    {
        // Seed default user
        var defaultUserId = Guid.Parse("244aaa4d-8b07-4e4d-89f9-09281b73b24f"); // Default test user ID
        var defaultUser = new User
        {
            Id = defaultUserId,
            Email = "test@smartfinance.com",
            PasswordHash = "hashed_password_for_test", // This will be replaced by actual hash
            FirstName = "Test",
            LastName = "User",
            Role = UserRole.User,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = "system",
            UpdatedBy = "system"
        };
        var defaultAccounts = new[]
        {
            new Account
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                Name = "Main Account",
                Type = AccountType.Checking,
                Balance = 0,
                Currency = "BRL",
                IsActive = true,
                UserId = defaultUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "system",
                UpdatedBy = "system"
            },
            new Account
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000002"),
                Name = "Savings Account",
                Type = AccountType.Savings,
                Balance = 0,
                Currency = "BRL",
                IsActive = true,
                UserId = defaultUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "system",
                UpdatedBy = "system"
            }
        };

        // Seed default categories
        var defaultCategories = new[]
        {
            new Category
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111001"),
                Name = "Alimentação",
                Type = CategoryType.Expense,
                Color = "#FF6B6B",
                Icon = "🍽️",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "system",
                UpdatedBy = "system"
            },
            new Category
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111002"),
                Name = "Transporte",
                Type = CategoryType.Expense,
                Color = "#4ECDC4",
                Icon = "🚗",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "system",
                UpdatedBy = "system"
            },
            new Category
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111003"),
                Name = "Lazer",
                Type = CategoryType.Expense,
                Color = "#45B7D1",
                Icon = "🎬",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "system",
                UpdatedBy = "system"
            },
            new Category
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111004"),
                Name = "Salário",
                Type = CategoryType.Income,
                Color = "#96CEB4",
                Icon = "💰",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "system",
                UpdatedBy = "system"
            },
            new Category
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111005"),
                Name = "Outros",
                Type = CategoryType.Expense,
                Color = "#FFEAA7",
                Icon = "📦",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "system",
                UpdatedBy = "system"
            }
        };

        modelBuilder.Entity<User>().HasData(defaultUser);
        modelBuilder.Entity<Account>().HasData(defaultAccounts);
        modelBuilder.Entity<Category>().HasData(defaultCategories);
        
        // Log seed data creation
        Console.WriteLine("Seed data configured:");
        Console.WriteLine($"- {defaultAccounts.Length} default accounts");
        Console.WriteLine($"- {defaultCategories.Length} default categories");
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateAuditFields();
        NormalizeDateTimes();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateAuditFields()
    {
        var entries = ChangeTracker.Entries<BaseEntity>();

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTime.UtcNow;
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }
    }

    private void NormalizeDateTimes()
    {
        foreach (var entry in ChangeTracker.Entries())
        {
            foreach (var property in entry.Properties)
            {
                if (property.Metadata.ClrType == typeof(DateTime))
                {
                    if (property.CurrentValue is DateTime dateTime && dateTime.Kind == DateTimeKind.Unspecified)
                    {
                        property.CurrentValue = DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
                    }
                }
                else if (property.Metadata.ClrType == typeof(DateTime?))
                {
                    if (property.CurrentValue is DateTime dateTime && dateTime.Kind == DateTimeKind.Unspecified)
                    {
                        property.CurrentValue = DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
                    }
                }
            }
        }
    }
}
