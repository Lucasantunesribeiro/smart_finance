import request from 'supertest';
import express from 'express';
import { paymentRoutes } from '../../src/routes/paymentRoutes';
import { PaymentService } from '../../src/services/paymentService';
import { PaymentStatus, PaymentResponse } from '../../src/types/payment';

// Mock the PaymentService
jest.mock('../../src/services/paymentService');

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
app.use('/api/v1/payments', paymentRoutes);

// Error handler middleware
app.use((error: any, req: any, res: any, next: any) => {
  res.status(error.status || 500).json({
    status: 'error',
    message: error.message || 'Internal server error',
  });
});

describe('Payment Routes', () => {
  let mockPaymentService: jest.Mocked<PaymentService>;

  beforeEach(() => {
    mockPaymentService = new PaymentService() as jest.Mocked<PaymentService>;
    (PaymentService as jest.Mock).mockImplementation(() => mockPaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/payments/process', () => {
    it('should process payment successfully', async () => {
      const mockPayment: PaymentResponse = {
        id: 'payment-123',
        amount: 100.50,
        currency: 'USD',
        status: PaymentStatus.COMPLETED,
      };

      mockPaymentService.processPayment.mockResolvedValue(mockPayment);

      const paymentData = {
        amount: 100.50,
        currency: 'USD',
        description: 'Test payment',
      };

      const response = await request(app)
        .post('/api/v1/payments/process')
        .send(paymentData)
        .expect(201);

      expect(response.body).toEqual({
        status: 'success',
        data: mockPayment,
      });
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith(paymentData);
    });

    it('should handle payment processing errors', async () => {
      const error = new Error('Payment processing failed');
      mockPaymentService.processPayment.mockRejectedValue(error);

      const paymentData = {
        amount: 100.50,
        currency: 'USD',
        description: 'Test payment',
      };

      const response = await request(app)
        .post('/api/v1/payments/process')
        .send(paymentData)
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Payment processing failed');
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('should get payment by ID successfully', async () => {
      const mockPayment: PaymentResponse = {
        id: 'payment-123',
        amount: 100.50,
        currency: 'USD',
        status: PaymentStatus.COMPLETED,
      };

      mockPaymentService.getPaymentById.mockResolvedValue(mockPayment);

      const response = await request(app)
        .get('/api/v1/payments/payment-123')
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockPayment,
      });
      expect(mockPaymentService.getPaymentById).toHaveBeenCalledWith('payment-123');
    });

    it('should handle payment not found', async () => {
      const error = new Error('Payment not found') as any;
      error.status = 404;
      mockPaymentService.getPaymentById.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/v1/payments/nonexistent-id')
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Payment not found');
    });
  });

  describe('GET /api/v1/payments/:id/status', () => {
    it('should get payment status successfully', async () => {
      const mockStatus = PaymentStatus.COMPLETED;
      mockPaymentService.getPaymentStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/v1/payments/payment-123/status')
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: { status: mockStatus },
      });
      expect(mockPaymentService.getPaymentStatus).toHaveBeenCalledWith('payment-123');
    });
  });

  describe('POST /api/v1/payments/:id/cancel', () => {
    it('should cancel payment successfully', async () => {
      const mockCancelledPayment: PaymentResponse = {
        id: 'payment-123',
        amount: 100.50,
        currency: 'USD',
        status: PaymentStatus.CANCELLED,
      };

      mockPaymentService.cancelPayment.mockResolvedValue(mockCancelledPayment);

      const response = await request(app)
        .post('/api/v1/payments/payment-123/cancel')
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockCancelledPayment,
      });
      expect(mockPaymentService.cancelPayment).toHaveBeenCalledWith('payment-123');
    });
  });

  describe('GET /api/v1/payments/user/:userId', () => {
    it('should get user payments successfully', async () => {
      const mockPayments: PaymentResponse[] = [
        {
          id: 'payment-123',
          amount: 100.50,
          currency: 'USD',
          status: PaymentStatus.COMPLETED,
        },
        {
          id: 'payment-456',
          amount: 50.25,
          currency: 'USD',
          status: PaymentStatus.PENDING,
        },
      ];

      mockPaymentService.getUserPayments.mockResolvedValue(mockPayments);

      const response = await request(app)
        .get('/api/v1/payments/user/user-123')
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockPayments,
      });
      expect(mockPaymentService.getUserPayments).toHaveBeenCalledWith('user-123');
    });
  });
});