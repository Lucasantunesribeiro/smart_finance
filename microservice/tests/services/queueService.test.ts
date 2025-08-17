import { queueService } from '../../src/services/queueService';

// Mock Bull queue
jest.mock('bull');

describe('QueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize queue service successfully', async () => {
      await expect(queueService.initialize()).resolves.not.toThrow();
    });
  });

  describe('addPaymentProcessingJob', () => {
    it('should add payment processing job to queue', async () => {
      const paymentId = 'payment-123';
      
      await expect(queueService.addPaymentProcessingJob(paymentId))
        .resolves.not.toThrow();
    });

    it('should handle invalid payment ID', async () => {
      const invalidPaymentId = '';
      
      await expect(queueService.addPaymentProcessingJob(invalidPaymentId))
        .rejects.toThrow('Payment ID is required');
    });

    it('should handle null payment ID', async () => {
      await expect(queueService.addPaymentProcessingJob(null as any))
        .rejects.toThrow('Payment ID is required');
    });
  });

  describe('shutdown', () => {
    it('should shutdown queue service gracefully', async () => {
      await expect(queueService.shutdown()).resolves.not.toThrow();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await queueService.getQueueStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });
  });

  describe('retryFailedJobs', () => {
    it('should retry failed jobs successfully', async () => {
      const retriedCount = await queueService.retryFailedJobs();
      
      expect(typeof retriedCount).toBe('number');
      expect(retriedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearQueue', () => {
    it('should clear all jobs from queue', async () => {
      await expect(queueService.clearQueue()).resolves.not.toThrow();
    });
  });
});