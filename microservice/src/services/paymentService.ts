import { v4 as uuidv4 } from 'uuid';
import { Payment, IPayment } from '../models/Payment';
import { PaymentRequest, PaymentResponse, PaymentStatus, PaymentMethod } from '../types/payment';
import { logger, auditLogger } from '../utils/logger';
import { fraudDetectionService } from './fraudDetectionService';
import { queueService } from './queueService';

export class PaymentService {
  async createPayment(paymentData: Omit<PaymentRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentResponse> {
    try {
      const paymentId = uuidv4();
      
      const payment = new Payment({
        _id: paymentId,
        ...paymentData,
        status: PaymentStatus.PENDING,
      });

      await payment.save();

      auditLogger.info('Payment created', {
        paymentId,
        userId: paymentData.userId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.paymentMethod,
      });

      await queueService.addPaymentProcessingJob(paymentId);

      return this.mapToPaymentResponse(payment);
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw new Error('Failed to create payment');
    }
  }

  async processPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new Error('Payment is not in pending status');
      }

      payment.status = PaymentStatus.PROCESSING;
      await payment.save();

      const fraudCheck = await fraudDetectionService.checkTransaction({
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        metadata: payment.metadata,
      });

      if (fraudCheck.isHighRisk) {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = 'Transaction flagged as high risk';
        await payment.save();

        auditLogger.warn('Payment failed due to fraud detection', {
          paymentId,
          userId: payment.userId,
          riskScore: fraudCheck.riskScore,
          riskFactors: fraudCheck.riskFactors,
        });

        throw new Error('Payment failed fraud check');
      }

      const processingResult = await this.processPaymentWithProvider(payment);

      if (processingResult.success) {
        payment.status = PaymentStatus.COMPLETED;
        payment.transactionId = processingResult.transactionId;
        payment.processedAt = new Date();
        payment.processingFee = processingResult.processingFee;
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = processingResult.failureReason;
      }

      await payment.save();

      auditLogger.info('Payment processed', {
        paymentId,
        userId: payment.userId,
        status: payment.status,
        transactionId: payment.transactionId,
        processingFee: payment.processingFee,
      });

      return this.mapToPaymentResponse(payment);
    } catch (error) {
      logger.error(`Error processing payment ${paymentId}:`, error);
      
      try {
        const payment = await Payment.findById(paymentId);
        if (payment) {
          payment.status = PaymentStatus.FAILED;
          payment.failureReason = error instanceof Error ? error.message : 'Unknown error';
          payment.retryCount += 1;
          payment.lastRetryAt = new Date();
          await payment.save();
        }
      } catch (updateError) {
        logger.error('Error updating payment status:', updateError);
      }

      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponse | null> {
    try {
      const payment = await Payment.findById(paymentId);
      return payment ? this.mapToPaymentResponse(payment) : null;
    } catch (error) {
      logger.error(`Error getting payment ${paymentId}:`, error);
      throw new Error('Failed to get payment');
    }
  }

  async getPaymentsByUser(userId: string, limit: number = 50, offset: number = 0): Promise<PaymentResponse[]> {
    try {
      const payments = await Payment.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);

      return payments.map(payment => this.mapToPaymentResponse(payment));
    } catch (error) {
      logger.error(`Error getting payments for user ${userId}:`, error);
      throw new Error('Failed to get payments');
    }
  }

  async retryPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== PaymentStatus.FAILED) {
        throw new Error('Only failed payments can be retried');
      }

      if (payment.retryCount >= 3) {
        throw new Error('Maximum retry attempts exceeded');
      }

      payment.status = PaymentStatus.PENDING;
      payment.failureReason = undefined;
      await payment.save();

      auditLogger.info('Payment retry initiated', {
        paymentId,
        userId: payment.userId,
        retryCount: payment.retryCount,
      });

      await queueService.addPaymentProcessingJob(paymentId);

      return this.mapToPaymentResponse(payment);
    } catch (error) {
      logger.error(`Error retrying payment ${paymentId}:`, error);
      throw error;
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<PaymentResponse> {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new Error('Only completed payments can be refunded');
      }

      const refundAmount = amount || payment.amount;
      
      if (refundAmount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount');
      }

      const refundResult = await this.processRefundWithProvider(payment, refundAmount);

      if (refundResult.success) {
        payment.status = PaymentStatus.REFUNDED;
        payment.metadata = {
          ...payment.metadata,
          refundAmount,
          refundTransactionId: refundResult.transactionId,
          refundedAt: new Date(),
        };
        await payment.save();

        auditLogger.info('Payment refunded', {
          paymentId,
          userId: payment.userId,
          refundAmount,
          refundTransactionId: refundResult.transactionId,
        });
      } else {
        throw new Error(refundResult.failureReason || 'Refund failed');
      }

      return this.mapToPaymentResponse(payment);
    } catch (error) {
      logger.error(`Error refunding payment ${paymentId}:`, error);
      throw error;
    }
  }

  private async processPaymentWithProvider(payment: IPayment): Promise<{
    success: boolean;
    transactionId?: string;
    processingFee?: number;
    failureReason?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (Math.random() > 0.1) {
      return {
        success: true,
        transactionId: `txn_${uuidv4()}`,
        processingFee: payment.amount * 0.029,
      };
    } else {
      return {
        success: false,
        failureReason: 'Insufficient funds',
      };
    }
  }

  private async processRefundWithProvider(payment: IPayment, amount: number): Promise<{
    success: boolean;
    transactionId?: string;
    failureReason?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (Math.random() > 0.05) {
      return {
        success: true,
        transactionId: `refund_${uuidv4()}`,
      };
    } else {
      return {
        success: false,
        failureReason: 'Refund processing failed',
      };
    }
  }

  async getPaymentById(paymentId: string): Promise<PaymentResponse | null> {
    try {
      const payment = await Payment.findById(paymentId);
      return payment ? this.mapToPaymentResponse(payment) : null;
    } catch (error) {
      logger.error('Error getting payment by ID:', error);
      throw new Error('Failed to get payment');
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      return payment.status;
    } catch (error) {
      logger.error('Error getting payment status:', error);
      if (error instanceof Error && error.message === 'Payment not found') {
        throw error;
      }
      throw new Error('Failed to get payment status');
    }
  }

  async cancelPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new Error('Payment cannot be cancelled');
      }

      payment.status = PaymentStatus.CANCELLED;
      payment.updatedAt = new Date();
      await payment.save();

      return this.mapToPaymentResponse(payment);
    } catch (error) {
      logger.error('Error cancelling payment:', error);
      if (error instanceof Error && (error.message === 'Payment not found' || error.message === 'Payment cannot be cancelled')) {
        throw error;
      }
      throw new Error('Failed to cancel payment');
    }
  }

  async getUserPayments(userId: string): Promise<PaymentResponse[]> {
    try {
      const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
      return payments.map(payment => this.mapToPaymentResponse(payment));
    } catch (error) {
      logger.error('Error getting user payments:', error);
      throw new Error('Failed to get user payments');
    }
  }

  private mapToPaymentResponse(payment: IPayment): PaymentResponse {
    return {
      id: (payment as any)._id.toString(),
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      transactionId: payment.transactionId,
      externalId: payment.externalId,
      processingFee: payment.processingFee,
      processedAt: payment.processedAt,
      failureReason: payment.failureReason,
      metadata: payment.metadata,
    };
  }
}

export const paymentService = new PaymentService();