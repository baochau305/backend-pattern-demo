import { Queue, type JobsOptions } from 'bullmq';
import { queueConnection } from './connection.js';
import {
  QueueName,
  type AnalyticsEventPayload,
  type OrderConfirmationPayload,
} from './jobs.js';

/**
 * Default job options applied to every enqueued job:
 *   - attempts + exponential backoff: transient failures (SMTP blips, etc.) are retried.
 *   - removeOnComplete: keep only the last 1000 successful jobs so Redis doesn't grow forever.
 *   - removeOnFail: retain the last 5000 failed jobs for inspection/replay (failed-job handling).
 */
const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export const emailQueue = new Queue<OrderConfirmationPayload>(QueueName.EMAIL, {
  connection: queueConnection,
  defaultJobOptions,
});

export const analyticsQueue = new Queue<AnalyticsEventPayload>(
  QueueName.ANALYTICS,
  { connection: queueConnection, defaultJobOptions },
);

export const closeQueues = async (): Promise<void> => {
  await Promise.all([emailQueue.close(), analyticsQueue.close()]);
};
