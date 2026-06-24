import 'reflect-metadata';
import { createEmailWorker } from './shared/queue/workers/email.worker.js';
import { createAnalyticsWorker } from './shared/queue/workers/analytics.worker.js';
import { logger } from './shared/logger/pino.js';

/**
 * Dedicated worker process — runs separately from the HTTP API (its own container
 * in docker-compose). Separating workers from the web tier means slow background
 * jobs never block request handling and the two can be scaled independently.
 */
const workers = [createEmailWorker(), createAnalyticsWorker()];
logger.info(`Started ${workers.length} queue worker(s)`);

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Shutting down workers');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
