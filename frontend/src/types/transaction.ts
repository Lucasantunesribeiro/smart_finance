export interface Transaction {
  id: string;
  amount: number;
  description: string;
  transactionDate: string;
  type: TransactionType;
  status: TransactionStatus;
  accountId: string;
  accountName: string;
  categoryId?: string;
  categoryName?: string;
  reference?: string;
  notes?: string;
  isRecurring: boolean;
  tags: TransactionTag[];
  createdAt: string;
}

export enum TransactionType {
  Income = 0,
  Expense = 1,
  Transfer = 2,
}

export enum TransactionStatus {
  Pending = 0,
  Completed = 1,
  Failed = 2,
  Cancelled = 3,
}

export interface TransactionTag {
  id: string;
  name: string;
  color: string;
}

export interface CreateTransactionRequest {
  amount: number;
  description: string;
  transactionDate: string;
  type: TransactionType;
  accountId: string;
  categoryId?: string;
  reference?: string;
  notes?: string;
  isRecurring: boolean;
  recurrencePattern?: string;
  tagNames: string[];
}

export interface UpdateTransactionRequest {
  amount?: number;
  description?: string;
  transactionDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  accountId?: string;
  categoryId?: string;
  reference?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  tagNames?: string[];
}

export interface TransactionFilter {
  fromDate?: string;
  toDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  accountId?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
  fromDate: string;
  toDate: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}