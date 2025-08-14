using MediatR;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Domain.Interfaces;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace SmartFinance.Application.Features.Transactions.Commands;

public class CreateTransactionCommand : IRequest<TransactionDto>
{
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public TransactionType Type { get; set; }
    public string AccountId { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string? CategoryId { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public bool IsRecurring { get; set; } = false;
    public string? RecurrencePattern { get; set; }
    public List<string> TagNames { get; set; } = new();
}

public class CreateTransactionCommandHandler : IRequestHandler<CreateTransactionCommand, TransactionDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateTransactionCommandHandler> _logger;

    public CreateTransactionCommandHandler(
        IUnitOfWork unitOfWork,
        ILogger<CreateTransactionCommandHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<TransactionDto> Handle(CreateTransactionCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Creating transaction for user: {UserId}", request.UserId);

        // Convert string AccountId to Guid
        if (!Guid.TryParse(request.AccountId, out var accountId))
        {
            throw new ArgumentException("Invalid AccountId format");
        }

        // Convert string CategoryId to Guid if provided
        Guid? categoryId = null;
        if (!string.IsNullOrEmpty(request.CategoryId))
        {
            if (!Guid.TryParse(request.CategoryId, out var parsedCategoryId))
            {
                throw new ArgumentException("Invalid CategoryId format");
            }
            categoryId = parsedCategoryId;
        }

        var account = await _unitOfWork.Repository<Account>()
            .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == request.UserId, cancellationToken);

        if (account == null)
        {
            throw new ArgumentException("Account not found or doesn't belong to user");
        }

        var transaction = new Transaction
        {
            Amount = request.Amount,
            Description = request.Description,
            TransactionDate = request.TransactionDate,
            Type = request.Type,
            Status = TransactionStatus.Pending,
            AccountId = accountId,
            UserId = request.UserId,
            CategoryId = categoryId,
            Reference = request.Reference,
            Notes = request.Notes,
            IsRecurring = request.IsRecurring,
            RecurrencePattern = request.RecurrencePattern,
            CreatedBy = request.UserId.ToString(),
            UpdatedBy = request.UserId.ToString()
        };

        foreach (var tagName in request.TagNames)
        {
            transaction.Tags.Add(new TransactionTag
            {
                Name = tagName,
                Color = GenerateTagColor(tagName)
            });
        }

        await _unitOfWork.Repository<Transaction>().AddAsync(transaction, cancellationToken);

        await UpdateAccountBalance(account, transaction, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Transaction created successfully: {TransactionId}", transaction.Id);

        return await MapToDto(transaction, cancellationToken);
    }

    private async Task UpdateAccountBalance(Account account, Transaction transaction, CancellationToken cancellationToken)
    {
        switch (transaction.Type)
        {
            case TransactionType.Income:
                account.Balance += transaction.Amount;
                break;
            case TransactionType.Expense:
                account.Balance -= transaction.Amount;
                break;
        }

        await _unitOfWork.Repository<Account>().UpdateAsync(account, cancellationToken);
    }

    private async Task<TransactionDto> MapToDto(Transaction transaction, CancellationToken cancellationToken)
    {
        var account = await _unitOfWork.Repository<Account>()
            .GetByIdAsync(transaction.AccountId, cancellationToken);

        var category = transaction.CategoryId.HasValue
            ? await _unitOfWork.Repository<Category>().GetByIdAsync(transaction.CategoryId.Value, cancellationToken)
            : null;

        return new TransactionDto
        {
            Id = transaction.Id,
            Amount = transaction.Amount,
            Description = transaction.Description,
            TransactionDate = transaction.TransactionDate,
            Type = transaction.Type,
            Status = transaction.Status,
            AccountId = transaction.AccountId,
            AccountName = account?.Name ?? "",
            CategoryId = transaction.CategoryId,
            CategoryName = category?.Name,
            Reference = transaction.Reference,
            Notes = transaction.Notes,
            IsRecurring = transaction.IsRecurring,
            Tags = transaction.Tags.Select(t => new TransactionTagDto
            {
                Id = t.Id,
                Name = t.Name,
                Color = t.Color
            }).ToList(),
            CreatedAt = transaction.CreatedAt
        };
    }

    private static string GenerateTagColor(string tagName)
    {
        var colors = new[]
        {
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
            "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
        };

        var index = Math.Abs(tagName.GetHashCode()) % colors.Length;
        return colors[index];
    }
}