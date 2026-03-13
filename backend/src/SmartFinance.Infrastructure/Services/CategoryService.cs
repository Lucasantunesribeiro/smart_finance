using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using SmartFinance.Infrastructure.Data;

namespace SmartFinance.Infrastructure.Services;

public class CategoryService : ICategoryService
{
    private readonly SmartFinanceDbContext _context;
    private readonly ILogger<CategoryService> _logger;

    public CategoryService(SmartFinanceDbContext context, ILogger<CategoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResponseDto<CategoryDto>> GetCategoriesAsync(Guid userId, int page, int pageSize, bool? isActive, int? type, string sortBy, string sortOrder, string search, CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Categories
            .AsNoTracking()
            .Where(c => !c.IsDeleted && (c.UserId == null || c.UserId == userId));

        if (isActive.HasValue)
        {
            query = query.Where(c => c.IsActive == isActive.Value);
        }

        if (type.HasValue)
        {
            query = query.Where(c => (int)c.Type == type.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = $"%{search.Trim()}%";
            query = query.Where(c =>
                EF.Functions.Like(c.Name, searchTerm) ||
                (c.Description != null && EF.Functions.Like(c.Description, searchTerm)));
        }

        query = ApplySorting(query, sortBy, sortOrder);

        var totalCount = await query.CountAsync(cancellationToken);
        var rawItems = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Type,
                c.Description,
                c.Color,
                c.Icon,
                c.ParentId,
                ParentName = c.Parent != null ? c.Parent.Name : null,
                c.IsActive,
                c.CreatedAt,
                c.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var categoryIds = rawItems.Select(c => c.Id).ToList();
        var transactionStats = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.CategoryId.HasValue && categoryIds.Contains(t.CategoryId.Value) && !t.IsDeleted)
            .GroupBy(t => t.CategoryId!.Value)
            .Select(g => new { CategoryId = g.Key, Count = g.Count(), TotalAmount = g.Sum(t => (double)t.Amount) })
            .ToListAsync(cancellationToken);

        var statsMap = transactionStats.ToDictionary(s => s.CategoryId, s => s);
        var items = rawItems.Select(c =>
        {
            statsMap.TryGetValue(c.Id, out var stats);
            return new CategoryDto
            {
                Id = c.Id.ToString(),
                Name = c.Name,
                Type = (int)c.Type,
                Description = c.Description,
                Color = c.Color,
                Icon = c.Icon,
                ParentId = c.ParentId?.ToString(),
                ParentName = c.ParentName,
                IsActive = c.IsActive,
                TransactionCount = stats?.Count ?? 0,
                TotalAmount = stats != null ? Convert.ToDecimal(stats.TotalAmount) : 0m,
                CreatedAt = c.CreatedAt.ToString("o"),
                UpdatedAt = c.UpdatedAt.ToString("o")
            };
        }).ToList();

        _logger.LogInformation("Retrieved {Count} categories for user {UserId}", items.Count, userId);

        return new PagedResponseDto<CategoryDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    public async Task<CategoryDto?> GetCategoryAsync(Guid userId, Guid categoryId, CancellationToken cancellationToken = default)
    {
        var category = await _context.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == categoryId && !c.IsDeleted && (c.UserId == null || c.UserId == userId), cancellationToken);

        if (category == null)
        {
            return null;
        }

        var stats = await GetCategoryStatsAsync(userId, categoryId, cancellationToken);

        return new CategoryDto
        {
            Id = category.Id.ToString(),
            Name = category.Name,
            Type = (int)category.Type,
            Description = category.Description,
            Color = category.Color,
            Icon = category.Icon,
            ParentId = category.ParentId?.ToString(),
            ParentName = null,
            IsActive = category.IsActive,
            TransactionCount = stats?.TotalTransactions ?? 0,
            TotalAmount = stats?.TotalAmount ?? 0m,
            CreatedAt = category.CreatedAt.ToString("o"),
            UpdatedAt = category.UpdatedAt.ToString("o")
        };
    }

    public async Task<CategoryDto> CreateCategoryAsync(Guid userId, CategoryCreateRequestDto request, CancellationToken cancellationToken = default)
    {
        var category = new Category
        {
            Name = request.Name.Trim(),
            Type = request.Type.HasValue ? (CategoryType)request.Type.Value : CategoryType.Expense,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Color = string.IsNullOrWhiteSpace(request.Color) ? "#3b82f6" : request.Color.Trim(),
            Icon = request.Icon,
            ParentId = ParseOptionalGuid(request.ParentCategoryId),
            IsActive = true,
            UserId = userId,
            CreatedBy = userId.ToString(),
            UpdatedBy = userId.ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync(cancellationToken);

        return new CategoryDto
        {
            Id = category.Id.ToString(),
            Name = category.Name,
            Type = (int)category.Type,
            Description = category.Description,
            Color = category.Color,
            Icon = category.Icon,
            ParentId = category.ParentId?.ToString(),
            ParentName = null,
            IsActive = category.IsActive,
            TransactionCount = 0,
            TotalAmount = 0m,
            CreatedAt = category.CreatedAt.ToString("o"),
            UpdatedAt = category.UpdatedAt.ToString("o")
        };
    }

    public async Task<CategoryDto?> UpdateCategoryAsync(Guid userId, Guid categoryId, CategoryUpdateRequestDto request, CancellationToken cancellationToken = default)
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == categoryId && !c.IsDeleted && (c.UserId == null || c.UserId == userId), cancellationToken);

        if (category == null)
        {
            return null;
        }

        if (request.Name != null)
        {
            category.Name = request.Name.Trim();
        }

        if (request.Type.HasValue)
        {
            category.Type = (CategoryType)request.Type.Value;
        }

        if (request.Description != null)
        {
            category.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        }

        if (request.Color != null)
        {
            category.Color = string.IsNullOrWhiteSpace(request.Color) ? "#3b82f6" : request.Color.Trim();
        }

        if (request.Icon != null)
        {
            category.Icon = request.Icon;
        }

        if (request.ParentCategoryId != null)
        {
            category.ParentId = ParseOptionalGuid(request.ParentCategoryId);
        }

        if (request.IsActive.HasValue)
        {
            category.IsActive = request.IsActive.Value;
        }

        category.UpdatedAt = DateTime.UtcNow;
        category.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync(cancellationToken);

        return await GetCategoryAsync(userId, category.Id, cancellationToken);
    }

    public async Task<bool> DeleteCategoryAsync(Guid userId, Guid categoryId, CancellationToken cancellationToken = default)
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == categoryId && !c.IsDeleted && (c.UserId == null || c.UserId == userId), cancellationToken);

        if (category == null)
        {
            return false;
        }

        category.IsDeleted = true;
        category.IsActive = false;
        category.UpdatedAt = DateTime.UtcNow;
        category.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<CategoryStatsDto?> GetCategoryStatsAsync(Guid userId, Guid categoryId, CancellationToken cancellationToken = default)
    {
        var exists = await _context.Categories
            .AsNoTracking()
            .AnyAsync(c => c.Id == categoryId && !c.IsDeleted && (c.UserId == null || c.UserId == userId), cancellationToken);

        if (!exists)
        {
            return null;
        }

        var transactions = _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.CategoryId == categoryId && !t.IsDeleted);

        var totalTransactions = await transactions.CountAsync(cancellationToken);
        var totalAmount = Convert.ToDecimal(await transactions.SumAsync(t => (double?)t.Amount, cancellationToken) ?? 0d);
        var lastTransactionDate = await transactions.MaxAsync(t => (DateTime?)t.TransactionDate, cancellationToken);

        return new CategoryStatsDto
        {
            TotalTransactions = totalTransactions,
            TotalAmount = totalAmount,
            AverageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0m,
            LastTransaction = lastTransactionDate?.ToString("o")
        };
    }

    private static Guid? ParseOptionalGuid(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return Guid.Parse(value);
    }

    private static IQueryable<Category> ApplySorting(IQueryable<Category> query, string sortBy, string sortOrder)
    {
        var descending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        return sortBy.ToLowerInvariant() switch
        {
            "type" => descending ? query.OrderByDescending(c => c.Type) : query.OrderBy(c => c.Type),
            "createdat" => descending ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt),
            "updatedat" => descending ? query.OrderByDescending(c => c.UpdatedAt) : query.OrderBy(c => c.UpdatedAt),
            _ => descending ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name)
        };
    }
}
