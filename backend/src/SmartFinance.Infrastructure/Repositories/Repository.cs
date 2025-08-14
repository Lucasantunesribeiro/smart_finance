using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SmartFinance.Domain.Common;
using SmartFinance.Domain.Interfaces;
using SmartFinance.Infrastructure.Data;

namespace SmartFinance.Infrastructure.Repositories;

public class Repository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly SmartFinanceDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(SmartFinanceDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet.ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _dbSet.Where(predicate).ToListAsync(cancellationToken);
    }

    public async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(predicate, cancellationToken);
    }

    public async Task<T> AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        await _dbSet.AddAsync(entity, cancellationToken);
        return entity;
    }

    public async Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default)
    {
        await _dbSet.AddRangeAsync(entities, cancellationToken);
        return entities;
    }

    public Task UpdateAsync(T entity, CancellationToken cancellationToken = default)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public async Task UpdateWithoutTrackingAsync(T entity, CancellationToken cancellationToken = default)
    {
        // Detach any existing tracked entity with the same ID
        var existingEntry = _context.Entry(entity);
        if (existingEntry.State != EntityState.Detached)
        {
            existingEntry.State = EntityState.Detached;
        }

        // Find any other tracked entity with the same ID and detach it
        var tracked = _context.ChangeTracker.Entries<T>()
            .FirstOrDefault(e => e.Entity.Id == entity.Id);
        if (tracked != null)
        {
            tracked.State = EntityState.Detached;
        }

        // Now attach and mark as modified
        _context.Attach(entity);
        _context.Entry(entity).State = EntityState.Modified;
        
        await Task.CompletedTask;
    }

    public Task DeleteAsync(T entity, CancellationToken cancellationToken = default)
    {
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public async Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken cancellationToken = default)
    {
        if (predicate != null)
        {
            return await _dbSet.CountAsync(predicate, cancellationToken);
        }
        return await _dbSet.CountAsync(cancellationToken);
    }

    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _dbSet.AnyAsync(predicate, cancellationToken);
    }

    public async Task<int> ExecuteUpdateAsync<TUpdate>(Expression<Func<T, bool>> predicate, Expression<Func<TUpdate, TUpdate>> updateExpression, CancellationToken cancellationToken = default)
    {
        var updateExpr = updateExpression as Expression<Func<Microsoft.EntityFrameworkCore.Query.SetPropertyCalls<T>, Microsoft.EntityFrameworkCore.Query.SetPropertyCalls<T>>>;
        if (updateExpr == null)
        {
            throw new InvalidOperationException("Invalid update expression");
        }
        return await _dbSet.Where(predicate).ExecuteUpdateAsync(updateExpr, cancellationToken);
    }
}

// Extensão específica para User
public static class UserRepositoryExtensions
{
    public static async Task<Domain.Entities.User?> GetUserByEmailAsync(
        this IRepository<Domain.Entities.User> repository, 
        string email, 
        CancellationToken cancellationToken = default)
    {
        return await repository.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }
}