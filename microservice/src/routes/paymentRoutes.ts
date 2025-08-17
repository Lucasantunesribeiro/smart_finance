import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { PaymentService } from '../services/paymentService';

const router = Router();
const paymentService = new PaymentService();

// Process payment
router.post('/process', authMiddleware, async (req, res, next) => {
  try {
    const payment = await paymentService.processPayment(req.body.id);
    res.status(201).json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    next(error);
  }
});

// Get payment by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    next(error);
  }
});

// Get payment status
router.get('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const status = await paymentService.getPaymentStatus(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { status }
    });
  } catch (error) {
    next(error);
  }
});

// Cancel payment
router.post('/:id/cancel', authMiddleware, requireRole(['admin', 'user']), async (req, res, next) => {
  try {
    const payment = await paymentService.cancelPayment(req.params.id);
    res.status(200).json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    next(error);
  }
});

// Refund payment
router.post('/:id/refund', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const refund = await paymentService.refundPayment(req.params.id, req.body.amount);
    res.status(200).json({
      status: 'success',
      data: refund
    });
  } catch (error) {
    next(error);
  }
});

// Get user payments
router.get('/user/:userId', authMiddleware, async (req, res, next) => {
  try {
    const payments = await paymentService.getUserPayments(req.params.userId);
    res.status(200).json({
      status: 'success',
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

export const paymentRoutes = router; 