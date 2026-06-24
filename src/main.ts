import 'reflect-metadata';
import type { Server } from 'node:http';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger/pino.js';
import { dataSource } from './shared/database/data-source.js';
import { connectRedis, disconnectRedis } from './shared/redis/redis.js';
import { closeQueues } from './shared/queue/queues.js';
import { createApp } from './shared/app.js';

/**
 * Application entrypoint.
 *
 * Bootstrap order is explicit: connect infrastructure (DB + Redis) first, build
 * the app, then start listening. Hostnames come entirely from env (DATABASE_URL /
 * REDIS_URL) — no per-environment overrides in code — so the same binary runs
 * locally (localhost) and in Docker (service names) just by changing env vars.
 */
const bootstrap = async (): Promise<void> => {
  await dataSource.initialize();
  logger.info('Database connected');
  const redis = await connectRedis();

  const app = createApp({ dataSource, redis });
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown: stop accepting connections, then release resources.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down');
    server.close();
    await Promise.allSettled([
      dataSource.destroy(),
      disconnectRedis(),
      closeQueues(),
    ]);
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during bootstrap');
  process.exit(1);
});
