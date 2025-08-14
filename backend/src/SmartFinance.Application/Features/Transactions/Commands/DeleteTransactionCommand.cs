using MediatR;
using SmartFinance.Domain.Interfaces;
using SmartFinance.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace SmartFinance.Application.Features.Transactions.Commands
{
    public class DeleteTransactionCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
    }

    public class DeleteTransactionCommandHandler : IRequestHandler<DeleteTransactionCommand, bool>
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<DeleteTransactionCommandHandler> _logger;

        public DeleteTransactionCommandHandler(
            IUnitOfWork unitOfWork,
            ILogger<DeleteTransactionCommandHandler> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<bool> Handle(DeleteTransactionCommand request, CancellationToken cancellationToken)
        {
            _logger.LogInformation("Deleting transaction {TransactionId} for user: {UserId}", request.Id, request.UserId);

            var transaction = await _unitOfWork.Repository<Transaction>()
                .FirstOrDefaultAsync(t => t.Id == request.Id && t.UserId == request.UserId, cancellationToken);

            if (transaction == null)
            {
                _logger.LogWarning("Transaction {TransactionId} not found or doesn't belong to user {UserId}", request.Id, request.UserId);
                return false;
            }

            // Store original values for balance adjustment
            var originalAmount = transaction.Amount;
            var originalAccountId = transaction.AccountId;

            // Delete the transaction (soft delete)
            await _unitOfWork.Repository<Transaction>().DeleteAsync(transaction, cancellationToken);

            // Update account balance
            await UpdateAccountBalance(originalAccountId, transaction, originalAmount, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Transaction deleted successfully: {TransactionId}", transaction.Id);

            return true;
        }

        private async Task UpdateAccountBalance(Guid accountId, Transaction transaction, decimal originalAmount, CancellationToken cancellationToken)
        {
            var account = await _unitOfWork.Repository<Account>()
                .GetByIdAsync(accountId, cancellationToken);

            if (account != null)
            {
                // Revert the transaction effect on account balance
                switch (transaction.Type)
                {
                    case Domain.Enums.TransactionType.Income:
                        account.Balance -= originalAmount;
                        break;
                    case Domain.Enums.TransactionType.Expense:
                        account.Balance += originalAmount;
                        break;
                }

                await _unitOfWork.Repository<Account>().UpdateAsync(account, cancellationToken);
                _logger.LogInformation("Account balance updated for account {AccountId}: {Balance}", accountId, account.Balance);
            }
        }
    }
} 