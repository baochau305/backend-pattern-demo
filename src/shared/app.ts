import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import { config } from './config/env.js';
import { logger, httpLogger } from './logger/pino.js';
import { errorHandler } from './errors/error-handler.js';
import { rateLimit } from './middlewares/rate-limit.js';
import { setupSwagger } from './swagger/swagger.js';
import { dataSource } from './database/data-source.js';
import { authRouter } from '../modules/auth/controllers/auth.controller.js';
import { productRouter } from '../modules/products/controllers/product.controller.js';
import { categoryRouter } from '../modules/categories/controllers/category.controller.js';
import { orderRouter } from '../modules/orders/controllers/order.controller.js';
import { userRouter } from '../modules/users/controllers/user.controller.js';

export const createApp = async () => {
  config();
  await dataSource.initialize();

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(httpLogger());
  app.use(rateLimit());

  setupSwagger(app);

  app.use('/auth', authRouter);
  app.use('/products', productRouter);
  app.use('/categories', categoryRouter);
  app.use('/orders', orderRouter);
  app.use('/users', userRouter);

  app.use(errorHandler);

  logger.info({ msg: 'App initialized' });
  return app;
};
