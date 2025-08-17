import { BankingService } from '../../src/services/bankingService';
import { BankTransactionType, ReconciliationStatus } from '../../src/types/payment';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('BankingService', () => {
  let bankingService: BankingService;

  beforeEach(() => {
    bankingService = new BankingService();
    jest.clearAllMocks();
  });

  describe('createBankAccount', () => {
    it('should create bank account successfully', async () => {
      const accountData = {
        accountNumber: '1234567890',
        routingNumber: '021000021',
        accountType: 'checking',
        userId: 'user-123',
      };

      const result = await bankingService.createBankAccount(accountData);

      expect(result).toBeDefined();
      expect(result.accountNumber).toBe(accountData.accountNumber);
      expect(result.routingNumber).toBe(accountData.routingNumber);
      expect(result.accountType).toBe(accountData.accountType);
      expect(result.userId).toBe(accountData.userId);
      expect(result.isActive).toBe(true);
      expect(result.balance).toBe(0);
      expect(result.currency).toBe('USD');
    });

    it('should throw error for invalid account number', async () => {
      const accountData = {
        accountNumber: '', // Invalid
        routingNumber: '021000021',
        accountType: 'checking',
        userId: 'user-123',
      };

      await expect(bankingService.createBankAccount(accountData))
        .rejects.toThrow('Account number is required');
    });

    it('should throw error for invalid routing number', async () => {
      const accountData = {
        accountNumber: '1234567890',
        routingNumber: '123', // Invalid length
        accountType: 'checking',
        userId: 'user-123',
      };

      await expect(bankingService.createBankAccount(accountData))
        .rejects.toThrow('Invalid routing number');
    });
  });

  describe('processTransaction', () => {
    it('should process deposit transaction successfully', async () => {
      const transactionData = {
        accountId: 'account-123',
        type: BankTransactionType.DEPOSIT,
        amount: 100.50,
        currency: 'USD',
        description: 'Test deposit',
      };

      const result = await bankingService.processTransaction(transactionData);

      expect(result).toBeDefined();
      expect(result.type).toBe(BankTransactionType.DEPOSIT);
      expect(result.amount).toBe(100.50);
      expect(result.currency).toBe('USD');
      expect(result.description).toBe('Test deposit');
    });

    it('should process withdrawal transaction successfully', async () => {
      const transactionData = {
        accountId: 'account-123',
        type: BankTransactionType.WITHDRAWAL,
        amount: 50.25,
        currency: 'USD',
        description: 'Test withdrawal',
      };

      const result = await bankingService.processTransaction(transactionData);

      expect(result).toBeDefined();
      expect(result.type).toBe(BankTransactionType.WITHDRAWAL);
      expect(result.amount).toBe(50.25);
    });

    it('should throw error for negative amount', async () => {
      const transactionData = {
        accountId: 'account-123',
        type: BankTransactionType.DEPOSIT,
        amount: -100, // Invalid
        currency: 'USD',
        description: 'Test deposit',
      };

      await expect(bankingService.processTransaction(transactionData))
        .rejects.toThrow('Amount must be positive');
    });

    it('should throw error for missing account ID', async () => {
      const transactionData = {
        accountId: '', // Invalid
        type: BankTransactionType.DEPOSIT,
        amount: 100,
        currency: 'USD',
        description: 'Test deposit',
      };

      await expect(bankingService.processTransaction(transactionData))
        .rejects.toThrow('Account ID is required');
    });
  });

  describe('reconcileTransactions', () => {
    it('should reconcile transactions successfully', async () => {
      const bankTransactionId = 'bank-txn-123';
      const paymentId = 'payment-123';

      const result = await bankingService.reconcileTransactions(bankTransactionId, paymentId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].bankTransactionId).toBe(bankTransactionId);
      expect(result[0].paymentId).toBe(paymentId);
      expect(result[0].status).toBe(ReconciliationStatus.MATCHED);
    });

    it('should handle reconciliation with notes', async () => {
      const bankTransactionId = 'bank-txn-123';
      const paymentId = 'payment-123';
      const notes = 'Manual reconciliation';

      const result = await bankingService.reconcileTransactions(
        bankTransactionId, 
        paymentId, 
        notes
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].notes).toBe(notes);
    });

    it('should throw error for missing bank transaction ID', async () => {
      await expect(bankingService.reconcileTransactions('', 'payment-123'))
        .rejects.toThrow('Bank transaction ID is required');
    });
  });

  describe('getAccountBalance', () => {
    it('should return account balance successfully', async () => {
      const accountId = 'account-123';
      
      const balance = await bankingService.getAccountBalance(accountId);

      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for invalid account ID', async () => {
      await expect(bankingService.getAccountBalance(''))
        .rejects.toThrow('Account ID is required');
    });

    it('should throw error for non-existent account', async () => {
      await expect(bankingService.getAccountBalance('nonexistent-account'))
        .rejects.toThrow('Account not found');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history successfully', async () => {
      const accountId = 'account-123';
      
      const history = await bankingService.getTransactionHistory(accountId);

      expect(Array.isArray(history)).toBe(true);
      history.forEach(transaction => {
        expect(transaction).toHaveProperty('id');
        expect(transaction).toHaveProperty('accountId');
        expect(transaction).toHaveProperty('type');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('currency');
        expect(transaction).toHaveProperty('processedAt');
      });
    });

    it('should return transaction history with pagination', async () => {
      const accountId = 'account-123';
      const limit = 5;
      const offset = 10;
      
      const history = await bankingService.getTransactionHistory(accountId, limit, offset);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(limit);
    });

    it('should throw error for invalid account ID', async () => {
      await expect(bankingService.getTransactionHistory(''))
        .rejects.toThrow('Account ID is required');
    });
  });
});