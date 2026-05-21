import { Worker, type ConnectionOptions } from 'bullmq';
import { logger } from '../../logger/pino.js';

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  password: redisUrl.password || undefined,
  username: redisUrl.username || undefined,
};

new Worker(
  'email',
  async (job) => {
    // ...existing code...
    logger.info({ jobId: job.id, msg: 'Send order email' });
  },
  { connection },
);
