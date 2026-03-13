import Bull from 'bull';
import { logger } from '../utils/logger';
import { queueJobDurationSeconds, queueJobsTotal, setDependencyStatus } from '../observability/metrics';
import { paymentService } from './paymentService';
import { BankingService } from './bankingService';

export class QueueService {
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
      setDependencyStatus('queue', true);
      
      logger.info('Queue service initialized successfully');
    } catch (error) {
      setDependencyStatus('queue', false);
      logger.error('Error initializing queue service:', error);
      throw error;
    }
  }

  private setupPaymentProcessors(): void {
    this.paymentQueue.process('processPayment', 10, async (job) => {
      const { paymentId } = job.data;
      const endTimer = queueJobDurationSeconds.startTimer({ queue: 'payment', job_name: 'processPayment' });
      let status = 'success';
      
      try {
        logger.info(`Processing payment job: ${paymentId}`);
        
        const result = await paymentService.processPayment(paymentId);
        
        logger.info(`Payment processed successfully: ${paymentId}`, result);
        queueJobsTotal.inc({ queue: 'payment', job_name: 'processPayment', status });
        
        return result;
      } catch (error) {
        status = 'failure';
        queueJobsTotal.inc({ queue: 'payment', job_name: 'processPayment', status });
        logger.error(`Payment processing failed: ${paymentId}`, error);
        throw error;
      } finally {
        endTimer({ status });
      }
    });

    this.paymentQueue.process('retryPayment', 5, async (job) => {
      const { paymentId } = job.data;
      const endTimer = queueJobDurationSeconds.startTimer({ queue: 'payment', job_name: 'retryPayment' });
      let status = 'success';
      
      try {
        logger.info(`Retrying payment job: ${paymentId}`);
        
        const result = await paymentService.retryPayment(paymentId);
        
        logger.info(`Payment retry successful: ${paymentId}`, result);
        queueJobsTotal.inc({ queue: 'payment', job_name: 'retryPayment', status });
        
        return result;
      } catch (error) {
        status = 'failure';
        queueJobsTotal.inc({ queue: 'payment', job_name: 'retryPayment', status });
        logger.error(`Payment retry failed: ${paymentId}`, error);
        throw error;
      } finally {
        endTimer({ status });
      }
    });
  }

  private setupReconciliationProcessors(): void {
    this.reconciliationQueue.process('reconcileAccount', 5, async (job) => {
      const { accountId } = job.data;
      const endTimer = queueJobDurationSeconds.startTimer({ queue: 'reconciliation', job_name: 'reconcileAccount' });
      let status = 'success';
      
      try {
        logger.info(`Starting reconciliation for account: ${accountId}`);
        
        const result = await this.bankingService.reconcileAccount(accountId);
        
        logger.info(`Reconciliation completed for account: ${accountId}`, result);
        queueJobsTotal.inc({ queue: 'reconciliation', job_name: 'reconcileAccount', status });
        
        return result;
      } catch (error) {
        status = 'failure';
        queueJobsTotal.inc({ queue: 'reconciliation', job_name: 'reconcileAccount', status });
        logger.error(`Reconciliation failed for account: ${accountId}`, error);
        throw error;
      } finally {
        endTimer({ status });
      }
    });

    this.reconciliationQueue.process('syncBankData', 3, async (job) => {
      const { userId } = job.data;
      const endTimer = queueJobDurationSeconds.startTimer({ queue: 'reconciliation', job_name: 'syncBankData' });
      let status = 'success';
      
      try {
        logger.info(`Syncing bank data for user: ${userId}`);
        
        const result = await this.bankingService.syncUserBankData(userId);
        
        logger.info(`Bank data sync completed for user: ${userId}`, result);
        queueJobsTotal.inc({ queue: 'reconciliation', job_name: 'syncBankData', status });
        
        return result;
      } catch (error) {
        status = 'failure';
        queueJobsTotal.inc({ queue: 'reconciliation', job_name: 'syncBankData', status });
        logger.error(`Bank data sync failed for user: ${userId}`, error);
        throw error;
      } finally {
        endTimer({ status });
      }
    });
  }

  private setupEventHandlers(): void {
    this.paymentQueue.on('completed', (job, result) => {
      logger.info(`Payment job completed: ${job.id}`, result);
    });

    this.paymentQueue.on('failed', (job, err) => {
      queueJobsTotal.inc({ queue: 'payment', job_name: 'processPayment', status: 'failed_event' });
      logger.error(`Payment job failed: ${job.id}`, err);
    });

    this.paymentQueue.on('stalled', (job) => {
      queueJobsTotal.inc({ queue: 'payment', job_name: 'processPayment', status: 'stalled' });
      logger.warn(`Payment job stalled: ${job.id}`);
    });

    this.reconciliationQueue.on('completed', (job, result) => {
      logger.info(`Reconciliation job completed: ${job.id}`, result);
    });

    this.reconciliationQueue.on('failed', (job, err) => {
      queueJobsTotal.inc({ queue: 'reconciliation', job_name: String(job?.name ?? 'unknown'), status: 'failed_event' });
      logger.error(`Reconciliation job failed: ${job.id}`, err);
    });
  }

  async addPaymentProcessingJob(paymentId: string, delay?: number): Promise<void> {
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

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
      const paymentStats = await this.getJobCountSnapshot(this.paymentQueue);
      const reconciliationStats = await this.getJobCountSnapshot(this.reconciliationQueue);
      
      return {
        waiting: paymentStats.waiting + reconciliationStats.waiting,
        active: paymentStats.active + reconciliationStats.active,
        completed: paymentStats.completed + reconciliationStats.completed,
        failed: paymentStats.failed + reconciliationStats.failed,
        payment: paymentStats,
        reconciliation: reconciliationStats,
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      throw error;
    }
  }

  async retryFailedJobs(): Promise<number> {
    const failedJobs = [
      ...(await this.paymentQueue.getFailed()),
      ...(await this.reconciliationQueue.getFailed()),
    ];

    let retriedCount = 0;
    for (const job of failedJobs) {
      if (typeof job.retry === 'function') {
        await job.retry();
        retriedCount += 1;
      }
    }

    return retriedCount;
  }

  async clearQueue(): Promise<void> {
    await Promise.all([
      this.clearQueueJobs(this.paymentQueue),
      this.clearQueueJobs(this.reconciliationQueue),
    ]);
  }

  async shutdown(): Promise<void> {
    try {
      await this.paymentQueue.close();
      await this.reconciliationQueue.close();
      setDependencyStatus('queue', false);
      
      logger.info('Queue service shut down successfully');
    } catch (error) {
      logger.error('Error shutting down queue service:', error);
    }
  }

  private async getJobCountSnapshot(queue: Bull.Queue): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const counts = await queue.getJobCounts();

    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    };
  }

  private async clearQueueJobs(queue: Bull.Queue): Promise<void> {
    if (typeof queue.empty === 'function') {
      await queue.empty();
    }

    await Promise.all([
      queue.clean(0, 'wait'),
      queue.clean(0, 'active'),
      queue.clean(0, 'completed'),
      queue.clean(0, 'failed'),
      queue.clean(0, 'delayed'),
    ]);
  }
}

export const queueService = new QueueService();
