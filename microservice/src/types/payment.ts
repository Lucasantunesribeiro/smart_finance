export interface PaymentRequest {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: PaymentMethod;
  metadata?: Record<string, any>;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transactionId?: string;
  externalId?: string;
  processingFee?: number;
  processedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTOCURRENCY = 'cryptocurrency',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface BankAccount {
  id: string;
  userId: string;
  accountNumber: string;
  routingNumber: string;
  accountType: BankAccountType;
  bankName: string;
  accountHolderName: string;
  balance: number;
  currency: string;
  isActive: boolean;
  lastSyncAt?: Date;
  externalId?: string;
  metadata?: Record<string, any>;
}

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  INVESTMENT = 'investment',
  CREDIT = 'credit',
}

export interface BankTransaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  transactionType: BankTransactionType;
  category?: string;
  merchantName?: string;
  transactionDate: Date;
  processedAt: Date;
  externalId?: string;
  metadata?: Record<string, any>;
}

export enum BankTransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  TRANSFER = 'transfer',
  FEE = 'fee',
  INTEREST = 'interest',
}

export interface ReconciliationRecord {
  id: string;
  accountId: string;
  transactionId: string;
  externalTransactionId: string;
  amount: number;
  currency: string;
  reconciledAt: Date;
  discrepancy?: number;
  status: ReconciliationStatus;
  notes?: string;
}

export enum ReconciliationStatus {
  MATCHED = 'matched',
  UNMATCHED = 'unmatched',
  DISCREPANCY = 'discrepancy',
  PENDING = 'pending',
}

export interface FraudAlert {
  id: string;
  transactionId: string;
  userId: string;
  riskScore: number;
  riskFactors: string[];
  status: FraudStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export enum FraudStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_REVIEW = 'requires_review',
}