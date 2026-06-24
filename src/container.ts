import type { DataSource } from 'typeorm';
import type { RedisClientType } from 'redis';
import type { Router } from 'express';

import { CacheService } from './shared/cache/cache.service.js';
import { IdempotencyService } from './shared/utils/idempotency.service.js';
import { QueuePublisher } from './shared/queue/queue.publisher.js';
import { emailQueue, analyticsQueue } from './shared/queue/queues.js';

import { UserRepository } from './modules/users/repositories/user.repository.js';
import { RefreshTokenRepository } from './modules/auth/repositories/refresh-token.repository.js';
import { CategoryRepository } from './modules/categories/repositories/category.repository.js';
import { ProductRepository } from './modules/products/repositories/product.repository.js';
import { OrderRepository } from './modules/orders/repositories/order.repository.js';

import { AuthService } from './modules/auth/services/auth.service.js';
import { UserService } from './modules/users/services/user.service.js';
import { CategoryService } from './modules/categories/services/category.service.js';
import { ProductService } from './modules/products/services/product.service.js';
import { OrderService } from './modules/orders/services/order.service.js';

import { AuthController } from './modules/auth/controllers/auth.controller.js';
import { UserController } from './modules/users/controllers/user.controller.js';
import { CategoryController } from './modules/categories/controllers/category.controller.js';
import { ProductController } from './modules/products/controllers/product.controller.js';
import { OrderController } from './modules/orders/controllers/order.controller.js';

import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createUserRouter } from './modules/users/user.routes.js';
import { createCategoryRouter } from './modules/categories/category.routes.js';
import { createProductRouter } from './modules/products/product.routes.js';
import { createOrderRouter } from './modules/orders/order.routes.js';

export interface ContainerDeps {
  dataSource: DataSource;
  redis: RedisClientType;
}

export interface AppRouters {
  auth: Router;
  users: Router;
  categories: Router;
  products: Router;
  orders: Router;
}

/**
 * Composition root — the single place where the object graph is assembled.
 *
 * This is "poor man's DI": instead of a heavyweight container we wire dependencies
 * explicitly through constructors. Every class declares exactly what it needs, so
 * dependencies are obvious, the graph is type-checked, and any node can be swapped
 * (e.g. a fake repository in tests) without touching the others. Called once at
 * startup, AFTER the DataSource and Redis are connected.
 */
export const buildContainer = ({
  dataSource,
  redis,
}: ContainerDeps): AppRouters => {
  // Shared infrastructure services.
  const cache = new CacheService(redis);
  const idempotency = new IdempotencyService(redis);
  const queuePublisher = new QueuePublisher(emailQueue, analyticsQueue);

  // Repositories (data access).
  const userRepository = new UserRepository(dataSource);
  const refreshTokenRepository = new RefreshTokenRepository(dataSource);
  const categoryRepository = new CategoryRepository(dataSource);
  const productRepository = new ProductRepository(dataSource);
  const orderRepository = new OrderRepository(dataSource);

  // Services (business logic).
  const authService = new AuthService(userRepository, refreshTokenRepository);
  const userService = new UserService(userRepository);
  const categoryService = new CategoryService(categoryRepository);
  const productService = new ProductService(
    productRepository,
    categoryService,
    cache,
  );
  const orderService = new OrderService(
    dataSource,
    orderRepository,
    productRepository,
    idempotency,
    queuePublisher,
  );

  // Controllers (HTTP) -> routers.
  return {
    auth: createAuthRouter(new AuthController(authService)),
    users: createUserRouter(new UserController(userService)),
    categories: createCategoryRouter(new CategoryController(categoryService)),
    products: createProductRouter(new ProductController(productService)),
    orders: createOrderRouter(new OrderController(orderService)),
  };
};
