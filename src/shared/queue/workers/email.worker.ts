import { Worker, type Job } from 'bullmq';
import { queueConnection } from '../connection.js';
import { logger } from '../../logger/pino.js';
import { EmailJob, QueueName, type OrderConfirmationPayload } from '../jobs.js';

/**
 * Email worker. In a real system this would call an email provider (SES, SendGrid…).
 * Here it logs the work so the queueing mechanics (retries, concurrency, failure
 * handling) are demonstrable end-to-end.
 *
 * Throwing from the processor marks the attempt failed; BullMQ then re-runs it
 * according to the queue's retry/backoff policy until `attempts` is exhausted.
 */
export const createEmailWorker = (): Worker<OrderConfirmationPayload> => {
  const worker = new Worker<OrderConfirmationPayload>(
    QueueName.EMAIL,
    async (job: Job<OrderConfirmationPayload>) => {
      switch (job.name) {
        case EmailJob.ORDER_CONFIRMATION:
          logger.info(
            {
              jobId: job.id,
              orderId: job.data.orderId,
              userId: job.data.userId,
            },
            'Sending order confirmation email',
          );
          // await emailProvider.send(...)
          return;
        default:
          throw new Error(`Unknown email job: ${job.name}`);
      }
    },
    { connection: queueConnection, concurrency: 5 },
  );

  worker.on('completed', (job) =>
    logger.debug({ jobId: job.id }, 'Email job completed'),
  );
  worker.on('failed', (job, err) =>
    logger.error(
      { jobId: job?.id, attemptsMade: job?.attemptsMade, err },
      'Email job failed',
    ),
  );

  return worker;
};
