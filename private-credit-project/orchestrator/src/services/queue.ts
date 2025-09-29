import Queue from 'bull';
import { logger } from '../utils/logger';

export class QueueService {
  private queues: Map<string, Queue.Queue> = new Map();
  private isInitialized = false;

  constructor() {
    // Initialize Redis connection for Bull
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing queue service...');
      
      // Create default queues
      await this.createQueue('processSquadsTransaction');
      await this.createQueue('processSolanaEvent');
      await this.createQueue('processAttestation');
      await this.createQueue('processMXEComputation');
      await this.createQueue('processAuditRequest');
      
      this.isInitialized = true;
      logger.info('Queue service initialized');
    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    logger.info('Queue service closed');
  }

  private async createQueue(name: string): Promise<void> {
    const queue = new Queue(name, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
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

    // Set up event handlers
    queue.on('completed', (job) => {
      logger.info(`Job completed: ${name}`, { jobId: job.id });
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job failed: ${name}`, { jobId: job.id, error: err.message });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job stalled: ${name}`, { jobId: job.id });
    });

    this.queues.set(name, queue);
  }

  async addJob(queueName: string, data: any, options?: any): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.add(data, options);
      logger.info(`Job added to queue: ${queueName}`, { data });
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  async process(queueName: string, processor: (job: any) => Promise<void>): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      queue.process(processor);
      logger.info(`Processor registered for queue: ${queueName}`);
    } catch (error) {
      logger.error(`Failed to register processor for queue ${queueName}:`, error);
      throw error;
    }
  }

  async getQueueStats(queueName: string): Promise<any> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    } catch (error) {
      logger.error(`Failed to get queue stats for ${queueName}:`, error);
      throw error;
    }
  }

  async getAllQueueStats(): Promise<Map<string, any>> {
    const stats = new Map();
    
    for (const queueName of this.queues.keys()) {
      try {
        const queueStats = await this.getQueueStats(queueName);
        stats.set(queueName, queueStats);
      } catch (error) {
        logger.error(`Failed to get stats for queue ${queueName}:`, error);
        stats.set(queueName, { error: error.message });
      }
    }
    
    return stats;
  }

  async pauseQueue(queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.pause();
      logger.info(`Queue paused: ${queueName}`);
    } catch (error) {
      logger.error(`Failed to pause queue ${queueName}:`, error);
      throw error;
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.resume();
      logger.info(`Queue resumed: ${queueName}`);
    } catch (error) {
      logger.error(`Failed to resume queue ${queueName}:`, error);
      throw error;
    }
  }

  async cleanQueue(queueName: string, grace: number = 0): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
      logger.info(`Queue cleaned: ${queueName}`);
    } catch (error) {
      logger.error(`Failed to clean queue ${queueName}:`, error);
      throw error;
    }
  }

  async getJob(queueName: string, jobId: string): Promise<any> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.getJob(jobId);
      return job;
    } catch (error) {
      logger.error(`Failed to get job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }

  async retryJob(queueName: string, jobId: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.getJob(jobId);
      if (job) {
        await job.retry();
        logger.info(`Job retried: ${queueName}`, { jobId });
      } else {
        throw new Error(`Job ${jobId} not found`);
      }
    } catch (error) {
      logger.error(`Failed to retry job ${jobId} in queue ${queueName}:`, error);
      throw error;
    }
  }

  async removeJob(queueName: string, jobId: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Job removed: ${queueName}`, { jobId });
      } else {
        throw new Error(`Job ${jobId} not found`);
      }
    } catch (error) {
      logger.error(`Failed to remove job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }
}
