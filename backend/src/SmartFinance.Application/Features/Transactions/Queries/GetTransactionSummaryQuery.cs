using MediatR;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Domain.Interfaces;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Enums;
using Microsoft.Extensions.Logging;
using System.Linq.Expressions;

namespace SmartFinance.Application.Features.Transactions.Queries
{
    public class GetTransactionSummaryQuery : IRequest<TransactionSummaryDto>
    {
        public Guid UserId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
    }

    public class GetTransactionSummaryQueryHandler : IRequestHandler<GetTransactionSummaryQuery, TransactionSummaryDto>
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<GetTransactionSummaryQueryHandler> _logger;

        public GetTransactionSummaryQueryHandler(
            IUnitOfWork unitOfWork,
            ILogger<GetTransactionSummaryQueryHandler> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<TransactionSummaryDto> Handle(GetTransactionSummaryQuery request, CancellationToken cancellationToken)
        {
            try
            {
                var repository = _unitOfWork.Repository<Transaction>();
                
                // Use FromDate/ToDate if provided, otherwise use StartDate/EndDate
                var fromDate = request.FromDate != default ? request.FromDate : request.StartDate;
                var toDate = request.ToDate != default ? request.ToDate : request.EndDate;
                
                // Build filter for user and date range
                Expression<Func<Transaction, bool>> filter = t => 
                    t.UserId == request.UserId && 
                    t.TransactionDate >= fromDate && 
                    t.TransactionDate <= toDate &&
                    t.Status == TransactionStatus.Completed;
                
                // Get filtered transactions
                var transactions = await repository.FindAsync(filter, cancellationToken);
                
                // Calculate summary
                var summary = new TransactionSummaryDto
                {
                    FromDate = fromDate,
                    ToDate = toDate,
                    TransactionCount = transactions.Count(),
                    TotalIncome = transactions
                        .Where(t => t.Type == TransactionType.Income)
                        .Sum(t => t.Amount),
                    TotalExpense = transactions
                        .Where(t => t.Type == TransactionType.Expense)
                        .Sum(t => t.Amount)
                };
                
                summary.NetAmount = summary.TotalIncome - summary.TotalExpense;
                
                _logger.LogInformation(
                    "Transaction summary calculated for user {UserId}: Income={TotalIncome}, Expense={TotalExpense}, Net={NetAmount}, Count={TransactionCount}",
                    request.UserId, summary.TotalIncome, summary.TotalExpense, summary.NetAmount, summary.TransactionCount);
                
                return summary;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transaction summary for user {UserId}", request.UserId);
                throw;
            }
        }
    }
} 