export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTOCURRENCY = 'cryptocurrency',
}

export interface PaymentRequest {
  id?: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description?: string;
  metadata?: Record<string, any>;
  externalId?: string;
  createdAt?: Date;
  updatedAt?: Date;
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

export interface FraudCheckRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  metadata?: Record<string, any>;
}

export interface FraudCheckResponse {
  isHighRisk: boolean;
  riskScore: number;
  riskFactors: string[];
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  routingNumber: string;
  accountType: string;
  balance: number;
  currency: string;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum BankTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  FEE = 'fee',
  INTEREST = 'interest',
}

export interface BankTransaction {
  id: string;
  accountId: string;
  type: BankTransactionType;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  externalId?: string;
  processedAt: Date;
  createdAt: Date;
}

export enum ReconciliationStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  UNMATCHED = 'unmatched',
  DISPUTED = 'disputed',
}

export interface ReconciliationRecord {
  id: string;
  bankTransactionId: string;
  paymentId?: string;
  status: ReconciliationStatus;
  amount: number;
  currency: string;
  reconciledAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}