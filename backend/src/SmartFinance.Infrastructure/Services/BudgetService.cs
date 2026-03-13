using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;

namespace SmartFinance.Infrastructure.Services;

public class BudgetService : IBudgetService
{
    private readonly SmartFinanceDbContext _context;
    private readonly ILogger<BudgetService> _logger;

    public BudgetService(SmartFinanceDbContext context, ILogger<BudgetService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResponseDto<BudgetItemDto>> GetBudgetsAsync(Guid userId, int page, int pageSize, BudgetPeriod? period, bool? isActive, string? categoryId, DateTime? fromDate, DateTime? toDate, string? search, string? sortBy, string? sortOrder, CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        Guid? parsedCategoryId = null;
        if (!string.IsNullOrWhiteSpace(categoryId))
        {
            parsedCategoryId = Guid.Parse(categoryId);
        }

        var query = _context.Budgets
            .AsNoTracking()
            .Include(b => b.Category)
            .Where(b => b.UserId == userId && !b.IsDeleted);

        if (period.HasValue)
        {
            query = query.Where(b => b.Period == period.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(b => b.IsActive == isActive.Value);
        }

        if (parsedCategoryId.HasValue)
        {
            query = query.Where(b => b.CategoryId == parsedCategoryId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(b => b.EndDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(b => b.StartDate <= toDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = $"%{search.Trim()}%";
            query = query.Where(b => EF.Functions.Like(b.Name, searchTerm));
        }

        query = ApplySorting(query, sortBy, sortOrder);

        var totalCount = await query.CountAsync(cancellationToken);
        var rawItems = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new
            {
                b.Id,
                b.Name,
                b.Amount,
                b.StartDate,
                b.EndDate,
                b.Period,
                b.IsActive,
                b.CategoryId,
                CategoryName = b.Category != null ? b.Category.Name : null,
                b.CreatedAt,
                b.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var items = new List<BudgetItemDto>();
        foreach (var item in rawItems)
        {
            var spent = await GetSpentAmountAsync(userId, item.CategoryId, item.StartDate, item.EndDate, cancellationToken);
            items.Add(MapBudgetItem(item.Id, item.Name, null, item.Amount, spent, item.CategoryId, item.CategoryName, item.Period, item.StartDate, item.EndDate, item.IsActive, item.CreatedAt, item.UpdatedAt));
        }

        _logger.LogInformation("Retrieved {Count} budgets for user {UserId}", items.Count, userId);

        return new PagedResponseDto<BudgetItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    public async Task<BudgetItemDto?> GetBudgetAsync(Guid userId, Guid budgetId, CancellationToken cancellationToken = default)
    {
        var budget = await _context.Budgets
            .AsNoTracking()
            .Include(b => b.Category)
            .FirstOrDefaultAsync(b => b.Id == budgetId && b.UserId == userId && !b.IsDeleted, cancellationToken);

        if (budget == null)
        {
            return null;
        }

        var spent = await GetSpentAmountAsync(userId, budget.CategoryId, budget.StartDate, budget.EndDate, cancellationToken);
        return MapBudgetItem(budget.Id, budget.Name, null, budget.Amount, spent, budget.CategoryId, budget.Category?.Name, budget.Period, budget.StartDate, budget.EndDate, budget.IsActive, budget.CreatedAt, budget.UpdatedAt);
    }

    public async Task<BudgetItemDto> CreateBudgetAsync(Guid userId, BudgetCreateRequestDto request, CancellationToken cancellationToken = default)
    {
        var budget = new Budget
        {
            Name = request.Name.Trim(),
            Amount = request.Allocated,
            SpentAmount = 0m,
            StartDate = DateTime.SpecifyKind(DateTime.Parse(request.StartDate).Date, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(DateTime.Parse(request.EndDate).Date, DateTimeKind.Utc),
            Period = request.Period,
            IsActive = true,
            UserId = userId,
            CategoryId = string.IsNullOrWhiteSpace(request.CategoryId) ? null : Guid.Parse(request.CategoryId),
            CreatedBy = userId.ToString(),
            UpdatedBy = userId.ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Budgets.Add(budget);
        await _context.SaveChangesAsync(cancellationToken);

        var categoryName = await _context.Categories
            .AsNoTracking()
            .Where(c => c.Id == budget.CategoryId)
            .Select(c => c.Name)
            .FirstOrDefaultAsync(cancellationToken);

        return MapBudgetItem(budget.Id, budget.Name, request.Description, budget.Amount, 0m, budget.CategoryId, categoryName, budget.Period, budget.StartDate, budget.EndDate, budget.IsActive, budget.CreatedAt, budget.UpdatedAt);
    }

    public async Task<BudgetItemDto?> UpdateBudgetAsync(Guid userId, Guid budgetId, BudgetUpdateRequestDto request, CancellationToken cancellationToken = default)
    {
        var budget = await _context.Budgets
            .Include(b => b.Category)
            .FirstOrDefaultAsync(b => b.Id == budgetId && b.UserId == userId && !b.IsDeleted, cancellationToken);

        if (budget == null)
        {
            return null;
        }

        if (request.Name != null)
        {
            budget.Name = request.Name.Trim();
        }

        if (request.Allocated.HasValue)
        {
            budget.Amount = request.Allocated.Value;
        }

        if (request.CategoryId != null)
        {
            budget.CategoryId = string.IsNullOrWhiteSpace(request.CategoryId) ? null : Guid.Parse(request.CategoryId);
        }

        if (request.Period.HasValue)
        {
            budget.Period = request.Period.Value;
        }

        if (request.StartDate != null)
        {
            budget.StartDate = DateTime.SpecifyKind(DateTime.Parse(request.StartDate).Date, DateTimeKind.Utc);
        }

        if (request.EndDate != null)
        {
            budget.EndDate = DateTime.SpecifyKind(DateTime.Parse(request.EndDate).Date, DateTimeKind.Utc);
        }

        if (request.IsActive.HasValue)
        {
            budget.IsActive = request.IsActive.Value;
        }

        budget.UpdatedAt = DateTime.UtcNow;
        budget.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync(cancellationToken);

        var spent = await GetSpentAmountAsync(userId, budget.CategoryId, budget.StartDate, budget.EndDate, cancellationToken);
        return MapBudgetItem(budget.Id, budget.Name, request.Description, budget.Amount, spent, budget.CategoryId, budget.Category?.Name, budget.Period, budget.StartDate, budget.EndDate, budget.IsActive, budget.CreatedAt, budget.UpdatedAt);
    }

    public async Task<bool> DeleteBudgetAsync(Guid userId, Guid budgetId, CancellationToken cancellationToken = default)
    {
        var budget = await _context.Budgets
            .FirstOrDefaultAsync(b => b.Id == budgetId && b.UserId == userId && !b.IsDeleted, cancellationToken);

        if (budget == null)
        {
            return false;
        }

        budget.IsDeleted = true;
        budget.IsActive = false;
        budget.UpdatedAt = DateTime.UtcNow;
        budget.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<BudgetSummaryDto> GetBudgetSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var budgets = await _context.Budgets
            .AsNoTracking()
            .Where(b => b.UserId == userId && !b.IsDeleted && b.IsActive)
            .ToListAsync(cancellationToken);

        decimal totalAllocated = 0m;
        decimal totalSpent = 0m;
        var overBudgetCount = 0;

        foreach (var budget in budgets)
        {
            totalAllocated += budget.Amount;
            var spent = await GetSpentAmountAsync(userId, budget.CategoryId, budget.StartDate, budget.EndDate, cancellationToken);
            totalSpent += spent;
            if (budget.Amount > 0 && (spent / budget.Amount) * 100m >= 90m)
            {
                overBudgetCount++;
            }
        }

        return new BudgetSummaryDto
        {
            TotalBudgets = budgets.Count,
            TotalAllocated = totalAllocated,
            TotalSpent = totalSpent,
            TotalRemaining = totalAllocated - totalSpent,
            OverBudgetCount = overBudgetCount,
            OnTrackCount = budgets.Count - overBudgetCount
        };
    }

    private async Task<decimal> GetSpentAmountAsync(Guid userId, Guid? categoryId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken)
    {
        var query = _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && !t.IsDeleted)
            .Where(t => t.TransactionDate >= startDate && t.TransactionDate <= endDate)
            .Where(t => t.Type == TransactionType.Expense);

        if (categoryId.HasValue)
        {
            query = query.Where(t => t.CategoryId == categoryId.Value);
        }

        var total = await query.SumAsync(t => (double?)(t.Amount < 0 ? -t.Amount : t.Amount), cancellationToken) ?? 0d;
        return Convert.ToDecimal(total);
    }

    private static IQueryable<Budget> ApplySorting(IQueryable<Budget> query, string? sortBy, string? sortOrder)
    {
        var descending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        return (sortBy ?? "name").ToLowerInvariant() switch
        {
            "amount" => descending ? query.OrderByDescending(b => b.Amount) : query.OrderBy(b => b.Amount),
            "startdate" => descending ? query.OrderByDescending(b => b.StartDate) : query.OrderBy(b => b.StartDate),
            "enddate" => descending ? query.OrderByDescending(b => b.EndDate) : query.OrderBy(b => b.EndDate),
            "createdat" => descending ? query.OrderByDescending(b => b.CreatedAt) : query.OrderBy(b => b.CreatedAt),
            "updatedat" => descending ? query.OrderByDescending(b => b.UpdatedAt) : query.OrderBy(b => b.UpdatedAt),
            _ => descending ? query.OrderByDescending(b => b.Name) : query.OrderBy(b => b.Name)
        };
    }

    private static BudgetItemDto MapBudgetItem(Guid id, string name, string? description, decimal allocated, decimal spent, Guid? categoryId, string? categoryName, BudgetPeriod period, DateTime startDate, DateTime endDate, bool isActive, DateTime createdAt, DateTime updatedAt)
    {
        var remaining = allocated - spent;
        var percentage = allocated > 0 ? (spent / allocated) * 100m : 0m;

        return new BudgetItemDto
        {
            Id = id.ToString(),
            Name = name,
            Description = description,
            Allocated = allocated,
            Spent = spent,
            Remaining = remaining,
            Percentage = Math.Round(percentage, 2),
            CategoryId = categoryId?.ToString(),
            CategoryName = categoryName,
            Period = (int)period,
            StartDate = startDate.ToString("yyyy-MM-dd"),
            EndDate = endDate.ToString("yyyy-MM-dd"),
            IsActive = isActive,
            CreatedAt = createdAt.ToString("o"),
            UpdatedAt = updatedAt.ToString("o")
        };
    }
}
