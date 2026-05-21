import { Queue, type ConnectionOptions } from 'bullmq';
import { redis } from '../redis/redis.js';

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  password: redisUrl.password || undefined,
  username: redisUrl.username || undefined,
};

export const emailQueue = new Queue('email', { connection });
export const analyticsQueue = new Queue('analytics', { connection });
