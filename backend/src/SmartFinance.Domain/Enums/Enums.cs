namespace SmartFinance.Domain.Enums;

public enum UserRole
{
    User = 0,
    Admin = 1,
    SuperAdmin = 2
}

public enum AccountType
{
    Checking = 0,
    Savings = 1,
    Investment = 2,
    Credit = 3,
    Loan = 4,
    Other = 5
}

public enum TransactionType
{
    Income = 0,
    Expense = 1,
    Transfer = 2
}

public enum TransactionStatus
{
    Pending = 0,
    Completed = 1,
    Failed = 2,
    Cancelled = 3
}

public enum CategoryType
{
    Income = 0,
    Expense = 1,
    Transfer = 2
}

public enum BudgetPeriod
{
    Weekly = 0,
    Monthly = 1,
    Quarterly = 2,
    Yearly = 3
}

public enum ReportType
{
    IncomeStatement = 0,
    BalanceSheet = 1,
    CashFlow = 2,
    Budget = 3,
    ExpenseAnalysis = 4,
    Custom = 5
}

public enum ReportStatus
{
    Pending = 0,
    Generating = 1,
    Completed = 2,
    Failed = 3
}