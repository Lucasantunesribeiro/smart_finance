using MediatR;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Domain.Interfaces;
using SmartFinance.Domain.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace SmartFinance.Application.Features.Transactions.Queries
{
    public class GetTransactionByIdQuery : IRequest<TransactionDto>
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
    }

    public class GetTransactionByIdQueryHandler : IRequestHandler<GetTransactionByIdQuery, TransactionDto>
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<GetTransactionByIdQueryHandler> _logger;

        public GetTransactionByIdQueryHandler(
            IUnitOfWork unitOfWork,
            ILogger<GetTransactionByIdQueryHandler> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<TransactionDto> Handle(GetTransactionByIdQuery request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Getting transaction {TransactionId} for user: {UserId}", request.Id, request.UserId);

                var transaction = await _unitOfWork.Repository<Transaction>()
                    .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

                if (transaction == null)
                {
                    _logger.LogWarning("Transaction {TransactionId} not found for user: {UserId}", request.Id, request.UserId);
                    return null;
                }

                // Verificar se a transação pertence ao usuário
                if (transaction.UserId != request.UserId)
                {
                    _logger.LogWarning("Transaction {TransactionId} does not belong to user: {UserId}", request.Id, request.UserId);
                    return null;
                }

                var transactionDto = new TransactionDto
                {
                    Id = transaction.Id,
                    Description = transaction.Description,
                    Amount = transaction.Amount,
                    Type = transaction.Type,
                    CategoryId = transaction.CategoryId,
                    CategoryName = transaction.Category?.Name,
                    AccountId = transaction.AccountId,
                    AccountName = transaction.Account?.Name,
                    TransactionDate = transaction.TransactionDate,
                    IsRecurring = transaction.IsRecurring,
                    TagNames = transaction.Tags?.Select(t => t.Name).ToList() ?? new List<string>(),
                    CreatedAt = transaction.CreatedAt,
                    UpdatedAt = transaction.UpdatedAt
                };

                _logger.LogInformation("Transaction {TransactionId} retrieved successfully for user: {UserId}", request.Id, request.UserId);
                return transactionDto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transaction {TransactionId} for user: {UserId}", request.Id, request.UserId);
                throw;
            }
        }
    }
} 
