import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

@Injectable()
export class BullService implements OnModuleDestroy {
  private readonly logger = new Logger(BullService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();

  constructor(private readonly config: ConfigService) {}

  private getRedisConfig() {
    return {
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD') || undefined,
    };
  }

  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.getRedisConfig(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  async addJob<T = unknown>(
    queueName: string,
    jobName: string,
    data: T,
    opts?: { delay?: number; priority?: number; jobId?: string },
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.add(jobName, data, {
      jobId: opts?.jobId,
      delay: opts?.delay,
      priority: opts?.priority,
    });
    this.logger.debug(`Job ${jobName} added to queue ${queueName}`);
  }

  registerWorker<T = unknown>(
    queueName: string,
    handler: JobHandler<T>,
    concurrency = 1,
  ): void {
    if (this.workers.has(queueName)) return;

    const worker = new Worker(
      queueName,
      async (job: Job<T>) => {
        this.logger.debug(`Processing job ${job.name} in ${queueName}`);
        await handler(job);
      },
      {
        connection: this.getRedisConfig(),
        concurrency,
      },
    );

    worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} completed in ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed in ${queueName}: ${err.message}`);
    });

    this.workers.set(queueName, worker);
  }

  async onModuleDestroy() {
    for (const [, queue] of this.queues) {
      await queue.close();
    }
    for (const [, worker] of this.workers) {
      await worker.close();
    }
  }
}
