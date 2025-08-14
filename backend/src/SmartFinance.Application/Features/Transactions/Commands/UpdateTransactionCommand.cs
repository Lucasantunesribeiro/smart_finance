using MediatR;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Domain.Enums;
using SmartFinance.Domain.Interfaces;
using SmartFinance.Domain.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace SmartFinance.Application.Features.Transactions.Commands
{
    public class UpdateTransactionCommand : IRequest<TransactionDto>
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public decimal? Amount { get; set; }
        public string? Description { get; set; }
        public string? Category { get; set; }
        public TransactionType? Type { get; set; }
        public DateTime? Date { get; set; }
        public DateTime? TransactionDate { get; set; }
        public TransactionStatus? Status { get; set; }
        public string? AccountId { get; set; }
        public string? CategoryId { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public bool? IsRecurring { get; set; }
        public string? RecurrencePattern { get; set; }
        public List<string>? TagNames { get; set; }
    }

    public class UpdateTransactionCommandHandler : IRequestHandler<UpdateTransactionCommand, TransactionDto>
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<UpdateTransactionCommandHandler> _logger;

        public UpdateTransactionCommandHandler(
            IUnitOfWork unitOfWork,
            ILogger<UpdateTransactionCommandHandler> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<TransactionDto> Handle(UpdateTransactionCommand request, CancellationToken cancellationToken)
        {
            _logger.LogInformation("Updating transaction {TransactionId} for user: {UserId}", request.Id, request.UserId);

            var transaction = await _unitOfWork.Repository<Transaction>()
                .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

            if (transaction == null)
            {
                _logger.LogWarning("Transaction {TransactionId} not found for user: {UserId}", request.Id, request.UserId);
                return null;
            }

            // Verificar se a transação pertence ao usuário
            if (transaction.Account?.UserId != request.UserId)
            {
                _logger.LogWarning("Transaction {TransactionId} does not belong to user: {UserId}", request.Id, request.UserId);
                return null;
            }

            var originalAmount = transaction.Amount;
            var originalAccountId = transaction.AccountId;

            // Update transaction properties
            if (request.Amount.HasValue)
                transaction.Amount = request.Amount.Value;

            if (!string.IsNullOrEmpty(request.Description))
                transaction.Description = request.Description;

            if (request.TransactionDate.HasValue)
                transaction.TransactionDate = request.TransactionDate.Value;

            if (request.Type.HasValue)
                transaction.Type = request.Type.Value;

            if (request.Status.HasValue)
                transaction.Status = request.Status.Value;

            if (!string.IsNullOrEmpty(request.AccountId))
            {
                if (Guid.TryParse(request.AccountId, out var accountId))
                {
                    var account = await _unitOfWork.Repository<Account>()
                        .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == request.UserId, cancellationToken);
                    if (account != null)
                    {
                        transaction.AccountId = accountId;
                    }
                }
            }

            if (!string.IsNullOrEmpty(request.CategoryId))
            {
                if (Guid.TryParse(request.CategoryId, out var categoryId))
                {
                    transaction.CategoryId = categoryId;
                }
            }

            if (!string.IsNullOrEmpty(request.Reference))
                transaction.Reference = request.Reference;

            if (!string.IsNullOrEmpty(request.Notes))
                transaction.Notes = request.Notes;

            if (request.IsRecurring.HasValue)
                transaction.IsRecurring = request.IsRecurring.Value;

            if (!string.IsNullOrEmpty(request.RecurrencePattern))
                transaction.RecurrencePattern = request.RecurrencePattern;

            transaction.UpdatedBy = request.UserId.ToString();

            // Handle tags if provided
            if (request.TagNames != null)
            {
                transaction.Tags.Clear();
                foreach (var tagName in request.TagNames)
                {
                    transaction.Tags.Add(new TransactionTag
                    {
                        Name = tagName,
                        Color = GenerateTagColor(tagName)
                    });
                }
            }

            await _unitOfWork.Repository<Transaction>().UpdateAsync(transaction, cancellationToken);

            // Update account balances if amount or account changed
            if (originalAmount != transaction.Amount || originalAccountId != transaction.AccountId)
            {
                await UpdateAccountBalances(originalAccountId, transaction, originalAmount, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Transaction updated successfully: {TransactionId}", transaction.Id);

            return await MapToDto(transaction, cancellationToken);
        }

        private async Task UpdateAccountBalances(Guid originalAccountId, Transaction transaction, decimal originalAmount, CancellationToken cancellationToken)
        {
            // Revert original transaction from original account
            if (originalAccountId != Guid.Empty)
            {
                var originalAccount = await _unitOfWork.Repository<Account>()
                    .GetByIdAsync(originalAccountId, cancellationToken);
                if (originalAccount != null)
                {
                    switch (transaction.Type)
                    {
                        case TransactionType.Income:
                            originalAccount.Balance -= originalAmount;
                            break;
                        case TransactionType.Expense:
                            originalAccount.Balance += originalAmount;
                            break;
                    }
                    await _unitOfWork.Repository<Account>().UpdateAsync(originalAccount, cancellationToken);
                }
            }

            // Apply new transaction to current account
            var currentAccount = await _unitOfWork.Repository<Account>()
                .GetByIdAsync(transaction.AccountId, cancellationToken);
            if (currentAccount != null)
            {
                switch (transaction.Type)
                {
                    case TransactionType.Income:
                        currentAccount.Balance += transaction.Amount;
                        break;
                    case TransactionType.Expense:
                        currentAccount.Balance -= transaction.Amount;
                        break;
                }
                await _unitOfWork.Repository<Account>().UpdateAsync(currentAccount, cancellationToken);
            }
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
                Tags = transaction.Tags?.Select(t => new TransactionTagDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    Color = t.Color
                }).ToList() ?? new List<TransactionTagDto>(),
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
} 