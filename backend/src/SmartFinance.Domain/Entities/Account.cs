using SmartFinance.Domain.Common;
using SmartFinance.Domain.Enums;

namespace SmartFinance.Domain.Entities;

public class Account : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AccountType Type { get; set; }
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "USD";
    public bool IsActive { get; set; } = true;
    public Guid UserId { get; set; }

    public virtual User User { get; set; } = null!;
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();

    /// <summary>
    /// Efeito de uma transação sobre o saldo: receita soma, despesa subtrai.
    /// Transferências não alteram o saldo aqui (não há conta de destino modelada).
    /// </summary>
    public static decimal BalanceEffect(TransactionType type, decimal amount) => type switch
    {
        TransactionType.Income => amount,
        TransactionType.Expense => -amount,
        _ => 0m
    };

    /// <summary>Aplica a transação ao saldo, arredondando para centavos.</summary>
    public void ApplyTransaction(TransactionType type, decimal amount)
    {
        Balance = Money.NormalizeSigned(Balance + BalanceEffect(type, amount));
    }

    /// <summary>Desfaz o efeito de uma transação aplicada anteriormente.</summary>
    public void RevertTransaction(TransactionType type, decimal amount)
    {
        Balance = Money.NormalizeSigned(Balance - BalanceEffect(type, amount));
    }
}
