import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import type { DataSource } from 'typeorm';
import type { RedisClientType } from 'redis';
import { httpLogger } from './logger/pino.js';
import { errorHandler } from './errors/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { rateLimit } from './middlewares/rate-limit.middleware.js';
import { setupSwagger } from './swagger/swagger.js';
import { buildContainer } from '../container.js';

interface AppDeps {
  dataSource: DataSource;
  redis: RedisClientType;
}

/**
 * Builds the Express application from already-connected infrastructure.
 *
 * Middleware order matters and is deliberate:
 *   helmet/cors (security headers) -> body parsing -> request logging ->
 *   rate limiting -> routes -> 404 -> global error handler (always last).
 *
 * `createApp` takes its dependencies as arguments (rather than reaching for
 * globals) so an integration test can pass a test DataSource/Redis.
 */
export const createApp = ({ dataSource, redis }: AppDeps): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  // Cap body size to blunt large-payload abuse; parsed JSON is the only input.
  app.use(express.json({ limit: '1mb' }));
  app.use(httpLogger());
  app.use(rateLimit(redis));

  setupSwagger(app);

  // Liveness/readiness probe (used by Docker healthchecks and orchestrators).
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        db: dataSource.isInitialized,
        redis: redis.isOpen,
      },
    });
  });

  const routers = buildContainer({ dataSource, redis });
  app.use('/auth', routers.auth);
  app.use('/users', routers.users);
  app.use('/categories', routers.categories);
  app.use('/products', routers.products);
  app.use('/orders', routers.orders);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
