import { PaymentService } from '../../src/services/paymentService';
import { Payment } from '../../src/models/Payment';
import { PaymentStatus, PaymentMethod } from '../../src/types/payment';
import { fraudDetectionService } from '../../src/services/fraudDetectionService';
import { queueService } from '../../src/services/queueService';

// Mock dependencies
jest.mock('../../src/models/Payment');
jest.mock('../../src/services/fraudDetectionService');
jest.mock('../../src/services/queueService');
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

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockPayment: any;

  beforeEach(() => {
    paymentService = new PaymentService();
    
    mockPayment = {
      _id: 'payment-123',
      userId: 'user-123',
      amount: 100.50,
      currency: 'USD',
      status: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      metadata: {},
      retryCount: 0,
      save: jest.fn().mockResolvedValue(true),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getPaymentById', () => {
    it('should return payment when found', async () => {
      (Payment.findById as jest.Mock).mockResolvedValue(mockPayment);

      const result = await paymentService.getPaymentById('payment-123');

      expect(result).toEqual({
        id: 'payment-123',
        status: PaymentStatus.PENDING,
        amount: 100.50,
        currency: 'USD',
        transactionId: undefined,
        externalId: undefined,
        processingFee: undefined,
        processedAt: undefined,
        failureReason: undefined,
        metadata: {},
      });
      expect(Payment.findById).toHaveBeenCalledWith('payment-123');
    });

    it('should return null when payment not found', async () => {
      (Payment.findById as jest.Mock).mockResolvedValue(null);

      const result = await paymentService.getPaymentById('nonexistent-id');

      expect(result).toBeNull();
      expect(Payment.findById).toHaveBeenCalledWith('nonexistent-id');
    });

    it('should throw error when database operation fails', async () => {
      (Payment.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(paymentService.getPaymentById('payment-123'))
        .rejects.toThrow('Failed to get payment');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status when payment exists', async () => {
      (Payment.findById as jest.Mock).mockResolvedValue(mockPayment);

      const result = await paymentService.getPaymentStatus('payment-123');

      expect(result).toBe(PaymentStatus.PENDING);
      expect(Payment.findById).toHaveBeenCalledWith('payment-123');
    });

    it('should throw error when payment not found', async () => {
      (Payment.findById as jest.Mock).mockResolvedValue(null);

      await expect(paymentService.getPaymentStatus('nonexistent-id'))
        .rejects.toThrow('Payment not found');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel pending payment successfully', async () => {
      (Payment.findById as jest.Mock).mockResolvedValue(mockPayment);

      const result = await paymentService.cancelPayment('payment-123');

      expect(mockPayment.status).toBe(PaymentStatus.CANCELLED);
      expect(mockPayment.save).toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.CANCELLED);
    });

    it('should throw error when payment not found', async () => {
      (Payment.findById as jest.Mock).mockResolvedValue(null);

      await expect(paymentService.cancelPayment('nonexistent-id'))
        .rejects.toThrow('Payment not found');
    });

    it('should throw error when payment is not pending', async () => {
      mockPayment.status = PaymentStatus.COMPLETED;
      (Payment.findById as jest.Mock).mockResolvedValue(mockPayment);

      await expect(paymentService.cancelPayment('payment-123'))
        .rejects.toThrow('Payment cannot be cancelled');
    });
  });

  describe('getUserPayments', () => {
    it('should return user payments successfully', async () => {
      const mockPayments = [mockPayment, { ...mockPayment, _id: 'payment-456' }];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
      };
      
      (Payment.find as jest.Mock).mockReturnValue(mockQuery);
      mockQuery.sort.mockResolvedValue(mockPayments);

      const result = await paymentService.getUserPayments('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('payment-123');
      expect(Payment.find).toHaveBeenCalledWith({ userId: 'user-123' });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should return empty array when no payments found', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
      };
      
      (Payment.find as jest.Mock).mockReturnValue(mockQuery);
      mockQuery.sort.mockResolvedValue([]);

      const result = await paymentService.getUserPayments('user-123');

      expect(result).toHaveLength(0);
    });

    it('should throw error when database operation fails', async () => {
      (Payment.find as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(paymentService.getUserPayments('user-123'))
        .rejects.toThrow('Failed to get user payments');
    });
  });

  describe('processPayment', () => {
    beforeEach(() => {
      (fraudDetectionService.checkTransaction as jest.Mock).mockResolvedValue({
        isHighRisk: false,
        riskScore: 0.1,
        riskFactors: [],
      });
      (queueService.addPaymentProcessingJob as jest.Mock).mockResolvedValue(true);
    });

    it('should process payment successfully when fraud check passes', async () => {
      (Payment.findById as jest.Mock).mockResolvedValue(mockPayment);
      
      // Mock successful payment processing
      jest.spyOn(paymentService as any, 'processPaymentWithProvider')
        .mockResolvedValue({
          success: true,
          transactionId: 'txn-123',
          processingFee: 2.91,
        });

      const result = await paymentService.processPayment('payment-123');

      expect(mockPayment.status).toBe(PaymentStatus.COMPLETED);
      expect(mockPayment.transactionId).toBe('txn-123');
      expect(mockPayment.processingFee).toBe(2.91);
      expect(mockPayment.save).toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should fail payment when fraud check fails', async () => {
      (Payment.findById as jest.Mock).mockResolvedValue(mockPayment);
      (fraudDetectionService.checkTransaction as jest.Mock).mockResolvedValue({
        isHighRisk: true,
        riskScore: 0.9,
        riskFactors: ['unusual_amount', 'new_device'],
      });

      await expect(paymentService.processPayment('payment-123'))
        .rejects.toThrow('Payment failed fraud check');

      expect(mockPayment.status).toBe(PaymentStatus.FAILED);
      expect(mockPayment.failureReason).toBe('Transaction flagged as high risk');
      expect(mockPayment.save).toHaveBeenCalled();
    });

    it('should throw error when payment not found', async () => {
      (Payment.findById as jest.Mock).mockResolvedValue(null);

      await expect(paymentService.processPayment('nonexistent-id'))
        .rejects.toThrow('Payment not found');
    });

    it('should throw error when payment is not pending', async () => {
      mockPayment.status = PaymentStatus.COMPLETED;
      (Payment.findById as jest.Mock).mockResolvedValue(mockPayment);

      await expect(paymentService.processPayment('payment-123'))
        .rejects.toThrow('Payment is not in pending status');
    });
  });
});