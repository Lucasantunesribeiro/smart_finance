export enum AccountType {
  Checking = 0,
  Savings = 1,
  Investment = 2,
  Credit = 3,
  Loan = 4,
  Other = 5,
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  accountNumber: string;
  isActive: boolean;
  currency: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface AccountSummary {
  totalBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountsCount: number;
  currency: string;
  lastUpdated: string;
} 