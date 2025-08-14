import Bull from 'bull';
import { createClient } from 'redis';
import { logger } from '../utils/logger';
import { paymentService } from './paymentService';
import { BankingService } from './bankingService';

class QueueService {
  private paymentQueue: Bull.Queue;
  private reconciliationQueue: Bull.Queue;
  private redisClient: any;
  private bankingService: BankingService;

  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    this.paymentQueue = new Bull('payment processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.reconciliationQueue = new Bull('bank reconciliation', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    this.bankingService = new BankingService();
  }

  async initialize(): Promise<void> {
    try {
      this.setupPaymentProcessors();
      this.setupReconciliationProcessors();
      this.setupEventHandlers();
      
      logger.info('Queue service initialized successfully');
    } catch (error) {
      logger.error('Error initializing queue service:', error);
      throw error;
    }
  }

  private setupPaymentProcessors(): void {
    this.paymentQueue.process('processPayment', 10, async (job) => {
      const { paymentId } = job.data;
      
      try {
        logger.info(`Processing payment job: ${paymentId}`);
        
        const result = await paymentService.processPayment(paymentId);
        
        logger.info(`Payment processed successfully: ${paymentId}`, result);
        
        return result;
      } catch (error) {
        logger.error(`Payment processing failed: ${paymentId}`, error);
        throw error;
      }
    });

    this.paymentQueue.process('retryPayment', 5, async (job) => {
      const { paymentId } = job.data;
      
      try {
        logger.info(`Retrying payment job: ${paymentId}`);
        
        const result = await paymentService.retryPayment(paymentId);
        
        logger.info(`Payment retry successful: ${paymentId}`, result);
        
        return result;
      } catch (error) {
        logger.error(`Payment retry failed: ${paymentId}`, error);
        throw error;
      }
    });
  }

  private setupReconciliationProcessors(): void {
    this.reconciliationQueue.process('reconcileAccount', 5, async (job) => {
      const { accountId } = job.data;
      
      try {
        logger.info(`Starting reconciliation for account: ${accountId}`);
        
        const result = await this.bankingService.reconcileAccount(accountId);
        
        logger.info(`Reconciliation completed for account: ${accountId}`, result);
        
        return result;
      } catch (error) {
        logger.error(`Reconciliation failed for account: ${accountId}`, error);
        throw error;
      }
    });

    this.reconciliationQueue.process('syncBankData', 3, async (job) => {
      const { userId } = job.data;
      
      try {
        logger.info(`Syncing bank data for user: ${userId}`);
        
        const result = await this.bankingService.syncUserBankData(userId);
        
        logger.info(`Bank data sync completed for user: ${userId}`, result);
        
        return result;
      } catch (error) {
        logger.error(`Bank data sync failed for user: ${userId}`, error);
        throw error;
      }
    });
  }

  private setupEventHandlers(): void {
    this.paymentQueue.on('completed', (job, result) => {
      logger.info(`Payment job completed: ${job.id}`, result);
    });

    this.paymentQueue.on('failed', (job, err) => {
      logger.error(`Payment job failed: ${job.id}`, err);
    });

    this.paymentQueue.on('stalled', (job) => {
      logger.warn(`Payment job stalled: ${job.id}`);
    });

    this.reconciliationQueue.on('completed', (job, result) => {
      logger.info(`Reconciliation job completed: ${job.id}`, result);
    });

    this.reconciliationQueue.on('failed', (job, err) => {
      logger.error(`Reconciliation job failed: ${job.id}`, err);
    });
  }

  async addPaymentProcessingJob(paymentId: string, delay?: number): Promise<void> {
    try {
      await this.paymentQueue.add('processPayment', { paymentId }, {
        delay: delay || 0,
        priority: 10,
      });
      
      logger.info(`Payment processing job added: ${paymentId}`);
    } catch (error) {
      logger.error(`Error adding payment processing job: ${paymentId}`, error);
      throw error;
    }
  }

  async addPaymentRetryJob(paymentId: string, delay: number = 5000): Promise<void> {
    try {
      await this.paymentQueue.add('retryPayment', { paymentId }, {
        delay,
        priority: 5,
      });
      
      logger.info(`Payment retry job added: ${paymentId}`);
    } catch (error) {
      logger.error(`Error adding payment retry job: ${paymentId}`, error);
      throw error;
    }
  }

  async addReconciliationJob(accountId: string): Promise<void> {
    try {
      await this.reconciliationQueue.add('reconcileAccount', { accountId }, {
        priority: 5,
      });
      
      logger.info(`Reconciliation job added: ${accountId}`);
    } catch (error) {
      logger.error(`Error adding reconciliation job: ${accountId}`, error);
      throw error;
    }
  }

  async addBankSyncJob(userId: string): Promise<void> {
    try {
      await this.reconciliationQueue.add('syncBankData', { userId }, {
        priority: 3,
      });
      
      logger.info(`Bank sync job added: ${userId}`);
    } catch (error) {
      logger.error(`Error adding bank sync job: ${userId}`, error);
      throw error;
    }
  }

  async scheduleRecurringReconciliation(): Promise<void> {
    try {
      await this.reconciliationQueue.add('reconcileAccount', {}, {
        repeat: { cron: '0 2 * * *' },
        priority: 1,
      });
      
      logger.info('Recurring reconciliation job scheduled');
    } catch (error) {
      logger.error('Error scheduling recurring reconciliation:', error);
      throw error;
    }
  }

  async getQueueStats(): Promise<any> {
    try {
      const paymentStats = await this.paymentQueue.getJobCounts();
      const reconciliationStats = await this.reconciliationQueue.getJobCounts();
      
      return {
        payment: paymentStats,
        reconciliation: reconciliationStats,
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.paymentQueue.close();
      await this.reconciliationQueue.close();
      
      logger.info('Queue service shut down successfully');
    } catch (error) {
      logger.error('Error shutting down queue service:', error);
    }
  }
}

export const queueService = new QueueService();