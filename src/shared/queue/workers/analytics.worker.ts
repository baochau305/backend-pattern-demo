import { Worker, type Job } from 'bullmq';
import { queueConnection } from '../connection.js';
import { logger } from '../../logger/pino.js';
import { QueueName, type AnalyticsEventPayload } from '../jobs.js';

/**
 * Analytics/event worker. Processes fire-and-forget tracking events off the
 * request path so HTTP handlers stay fast. Higher concurrency than email because
 * the work is cheap and independent.
 */
export const createAnalyticsWorker = (): Worker<AnalyticsEventPayload> => {
  const worker = new Worker<AnalyticsEventPayload>(
    QueueName.ANALYTICS,
    async (job: Job<AnalyticsEventPayload>) => {
      logger.info(
        { jobId: job.id, event: job.data.event, userId: job.data.userId },
        'Processing analytics event',
      );
      // await analyticsSink.track(job.data)
    },
    { connection: queueConnection, concurrency: 20 },
  );

  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, err }, 'Analytics job failed'),
  );

  return worker;
};
