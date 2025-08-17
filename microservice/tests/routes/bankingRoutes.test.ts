import request from 'supertest';
import express from 'express';
import { bankingRoutes } from '../../src/routes/bankingRoutes';
import { BankingService } from '../../src/services/bankingService';
import { BankTransactionType, ReconciliationStatus } from '../../src/types/payment';

// Mock the BankingService
jest.mock('../../src/services/bankingService');

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'user' };
    next();
  },
  requireRole: (roles: string[]) => (req: any, res: any, next: any) => {
    if (roles.includes(req.user?.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1/banking', bankingRoutes);

// Error handler middleware
app.use((error: any, req: any, res: any, next: any) => {
  res.status(error.status || 500).json({
    status: 'error',
    message: error.message || 'Internal server error',
  });
});

describe('Banking Routes', () => {
  let mockBankingService: jest.Mocked<BankingService>;

  beforeEach(() => {
    mockBankingService = new BankingService() as jest.Mocked<BankingService>;
    (BankingService as jest.Mock).mockImplementation(() => mockBankingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/banking/accounts', () => {
    it('should create bank account successfully', async () => {
      const mockAccount = {
        id: 'account-123',
        accountNumber: '1234567890',
        routingNumber: '021000021',
        accountType: 'checking',
        balance: 0,
        currency: 'USD',
        isActive: true,
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBankingService.createBankAccount.mockResolvedValue(mockAccount);

      const accountData = {
        accountNumber: '1234567890',
        routingNumber: '021000021',
        accountType: 'checking',
      };

      const response = await request(app)
        .post('/api/v1/banking/accounts')
        .send(accountData)
        .expect(201);

      expect(response.body).toEqual({
        status: 'success',
        data: mockAccount,
      });
      expect(mockBankingService.createBankAccount).toHaveBeenCalledWith({
        ...accountData,
        userId: 'test-user-id',
      });
    });

    it('should handle account creation errors', async () => {
      const error = new Error('Invalid account number');
      mockBankingService.createBankAccount.mockRejectedValue(error);

      const accountData = {
        accountNumber: '',
        routingNumber: '021000021',
        accountType: 'checking',
      };

      const response = await request(app)
        .post('/api/v1/banking/accounts')
        .send(accountData)
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid account number');
    });
  });

  describe('POST /api/v1/banking/transactions', () => {
    it('should process transaction successfully', async () => {
      const mockTransaction = {
        id: 'txn-123',
        accountId: 'account-123',
        type: BankTransactionType.DEPOSIT,
        amount: 100.50,
        currency: 'USD',
        description: 'Test deposit',
        processedAt: new Date(),
        createdAt: new Date(),
      };

      mockBankingService.processTransaction.mockResolvedValue(mockTransaction);

      const transactionData = {
        accountId: 'account-123',
        type: 'deposit',
        amount: 100.50,
        currency: 'USD',
        description: 'Test deposit',
      };

      const response = await request(app)
        .post('/api/v1/banking/transactions')
        .send(transactionData)
        .expect(201);

      expect(response.body).toEqual({
        status: 'success',
        data: mockTransaction,
      });
      expect(mockBankingService.processTransaction).toHaveBeenCalledWith(transactionData);
    });
  });

  describe('GET /api/v1/banking/accounts/:accountId/balance', () => {
    it('should get account balance successfully', async () => {
      const mockBalance = 1500.75;
      mockBankingService.getAccountBalance.mockResolvedValue(mockBalance);

      const response = await request(app)
        .get('/api/v1/banking/accounts/account-123/balance')
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: { balance: mockBalance },
      });
      expect(mockBankingService.getAccountBalance).toHaveBeenCalledWith('account-123');
    });

    it('should handle account not found', async () => {
      const error = new Error('Account not found');
      mockBankingService.getAccountBalance.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/v1/banking/accounts/nonexistent/balance')
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Account not found');
    });
  });

  describe('GET /api/v1/banking/accounts/:accountId/transactions', () => {
    it('should get transaction history successfully', async () => {
      const mockTransactions = [
        {
          id: 'txn-123',
          accountId: 'account-123',
          type: BankTransactionType.DEPOSIT,
          amount: 100.50,
          currency: 'USD',
          description: 'Test deposit',
          processedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'txn-456',
          accountId: 'account-123',
          type: BankTransactionType.WITHDRAWAL,
          amount: 50.25,
          currency: 'USD',
          description: 'Test withdrawal',
          processedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      mockBankingService.getTransactionHistory.mockResolvedValue(mockTransactions);

      const response = await request(app)
        .get('/api/v1/banking/accounts/account-123/transactions')
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockTransactions,
      });
      expect(mockBankingService.getTransactionHistory).toHaveBeenCalledWith(
        'account-123',
        50,
        0
      );
    });

    it('should handle pagination parameters', async () => {
      const mockTransactions: any[] = [];
      mockBankingService.getTransactionHistory.mockResolvedValue(mockTransactions);

      const response = await request(app)
        .get('/api/v1/banking/accounts/account-123/transactions?limit=10&offset=20')
        .expect(200);

      expect(mockBankingService.getTransactionHistory).toHaveBeenCalledWith(
        'account-123',
        10,
        20
      );
    });
  });

  describe('POST /api/v1/banking/reconcile', () => {
    it('should reconcile transactions successfully', async () => {
      const mockReconciliation = {
        id: 'recon-123',
        bankTransactionId: 'bank-txn-123',
        paymentId: 'payment-123',
        status: ReconciliationStatus.MATCHED,
        amount: 100.50,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBankingService.reconcileTransactions.mockResolvedValue([mockReconciliation]);

      const reconciliationData = {
        bankTransactionId: 'bank-txn-123',
        paymentId: 'payment-123',
        notes: 'Manual reconciliation',
      };

      const response = await request(app)
        .post('/api/v1/banking/reconcile')
        .send(reconciliationData)
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockReconciliation,
      });
      expect(mockBankingService.reconcileTransactions).toHaveBeenCalledWith(
        'bank-txn-123',
        'payment-123',
        'Manual reconciliation'
      );
    });

    it('should handle reconciliation errors', async () => {
      const error = new Error('Bank transaction not found');
      mockBankingService.reconcileTransactions.mockRejectedValue(error);

      const reconciliationData = {
        bankTransactionId: 'nonexistent',
        paymentId: 'payment-123',
      };

      const response = await request(app)
        .post('/api/v1/banking/reconcile')
        .send(reconciliationData)
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Bank transaction not found');
    });
  });
});