import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env.js';
import { logger } from '../logger/pino.js';

/**
 * Single shared Redis connection for the app (caching, rate limiting, idempotency).
 *
 * The client is created lazily and connected explicitly via `connectRedis()` during
 * application bootstrap — never at import time. This matters because:
 *   1. Unit tests can import modules that reference Redis without opening a socket.
 *   2. Bootstrap stays in control of ordering and error handling.
 *
 * BullMQ manages its own connections (see shared/queue) because it requires a
 * dedicated ioredis-style connection with `maxRetriesPerRequest: null`.
 */
export const redis: RedisClientType = createClient({ url: env.REDIS_URL });

redis.on('error', (err) => logger.error({ err }, 'Redis client error'));

export const connectRedis = async (): Promise<RedisClientType> => {
  if (!redis.isOpen) {
    await redis.connect();
    logger.info('Redis connected');
  }
  return redis;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redis.isOpen) await redis.quit();
};
