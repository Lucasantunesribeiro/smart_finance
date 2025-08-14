using MediatR;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Domain.Interfaces;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using Microsoft.Extensions.Logging;
using System.Linq.Expressions;

namespace SmartFinance.Application.Features.Transactions.Queries;

public class GetTransactionsQuery : IRequest<PagedResult<TransactionDto>>
{
    public Guid UserId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public TransactionType? Type { get; set; }
    public TransactionStatus? Status { get; set; }
    public Guid? AccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "TransactionDate";
    public string SortOrder { get; set; } = "desc";
}

public class GetTransactionsQueryHandler : IRequestHandler<GetTransactionsQuery, PagedResult<TransactionDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<GetTransactionsQueryHandler> _logger;

    public GetTransactionsQueryHandler(
        IUnitOfWork unitOfWork,
        ILogger<GetTransactionsQueryHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<PagedResult<TransactionDto>> Handle(GetTransactionsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var repository = _unitOfWork.Repository<Transaction>();
            
            // Build the filter expression
            var filter = BuildFilterExpression(request);
            
            // Get filtered transactions
            var transactions = await repository.FindAsync(filter, cancellationToken);
            
            // Apply sorting
            var sortedTransactions = ApplySorting(transactions, request.SortBy, request.SortOrder);
            
            // Apply pagination
            var totalCount = sortedTransactions.Count();
            var pagedTransactions = sortedTransactions
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList();
            
            // Map to DTOs
            var transactionDtos = pagedTransactions.Select(t => new TransactionDto
            {
                Id = t.Id,
                Amount = t.Amount,
                Description = t.Description,
                TransactionDate = t.TransactionDate,
                Type = t.Type,
                Status = t.Status,
                AccountId = t.AccountId,
                AccountName = "", // Will be populated later if needed
                CategoryId = t.CategoryId,
                CategoryName = null, // Will be populated later if needed
                Reference = t.Reference,
                Notes = "", // Will be populated later if needed
                IsRecurring = false, // Will be populated later if needed
                Tags = new List<TransactionTagDto>(), // Will be populated later if needed
                CreatedAt = t.CreatedAt
            }).ToList();
            
            return new PagedResult<TransactionDto>
            {
                Items = transactionDtos,
                Page = request.Page,
                PageSize = request.PageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling((double)totalCount / request.PageSize)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving transactions for user {UserId}", request.UserId);
            throw;
        }
    }

    private Expression<Func<Transaction, bool>> BuildFilterExpression(GetTransactionsQuery request)
    {
        Expression<Func<Transaction, bool>> filter = t => t.UserId == request.UserId;

        if (request.FromDate.HasValue)
        {
            filter = AndAlso(filter, t => t.TransactionDate >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            filter = AndAlso(filter, t => t.TransactionDate <= request.ToDate.Value);
        }

        if (request.Type.HasValue)
        {
            filter = AndAlso(filter, t => t.Type == request.Type.Value);
        }

        if (request.Status.HasValue)
        {
            filter = AndAlso(filter, t => t.Status == request.Status.Value);
        }

        if (request.MinAmount.HasValue)
        {
            filter = AndAlso(filter, t => t.Amount >= request.MinAmount.Value);
        }

        if (request.MaxAmount.HasValue)
        {
            filter = AndAlso(filter, t => t.Amount <= request.MaxAmount.Value);
        }

        if (request.AccountId.HasValue)
        {
            filter = AndAlso(filter, t => t.AccountId == request.AccountId.Value);
        }

        if (request.CategoryId.HasValue)
        {
            filter = AndAlso(filter, t => t.CategoryId == request.CategoryId.Value);
        }

        if (!string.IsNullOrEmpty(request.Search))
        {
            filter = AndAlso(filter, t => t.Description.Contains(request.Search));
        }

        return filter;
    }

    private IEnumerable<Transaction> ApplySorting(IEnumerable<Transaction> transactions, string sortBy, string sortOrder)
    {
        return sortBy.ToLower() switch
        {
            "amount" => sortOrder.ToLower() == "desc" 
                ? transactions.OrderByDescending(t => t.Amount)
                : transactions.OrderBy(t => t.Amount),
            "description" => sortOrder.ToLower() == "desc" 
                ? transactions.OrderByDescending(t => t.Description)
                : transactions.OrderBy(t => t.Description),
            "type" => sortOrder.ToLower() == "desc" 
                ? transactions.OrderByDescending(t => t.Type)
                : transactions.OrderBy(t => t.Type),
            "status" => sortOrder.ToLower() == "desc" 
                ? transactions.OrderByDescending(t => t.Status)
                : transactions.OrderBy(t => t.Status),
            _ => sortOrder.ToLower() == "desc" 
                ? transactions.OrderByDescending(t => t.TransactionDate)
                : transactions.OrderBy(t => t.TransactionDate)
        };
    }

    private Expression<Func<T, bool>> AndAlso<T>(Expression<Func<T, bool>> expr1, Expression<Func<T, bool>> expr2)
    {
        var parameter = Expression.Parameter(typeof(T));
        var body = Expression.AndAlso(
            Expression.Invoke(expr1, parameter),
            Expression.Invoke(expr2, parameter)
        );
        return Expression.Lambda<Func<T, bool>>(body, parameter);
    }
}

// Helper class for paginated results
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;
}