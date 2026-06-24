import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { env, isProduction } from '../config/env.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { Product } from '../../modules/products/entities/product.entity.js';
import { Category } from '../../modules/categories/entities/category.entity.js';
import { Order } from '../../modules/orders/entities/order.entity.js';
import { OrderItem } from '../../modules/orders/entities/order-item.entity.js';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity.js';

/**
 * TypeORM DataSource — the single connection pool for the app.
 *
 * `synchronize` is intentionally false: schema changes go through explicit,
 * reviewable migrations (see ./migrations) rather than being inferred at runtime,
 * which is the only safe option for production. Entities are listed explicitly so
 * the build does not depend on glob/file-path resolution after compilation.
 */

// Resolve the migrations glob from this file's real directory (works under both
// tsx/`.ts` in dev and compiled `.js` in dist). NOTE: we use a filesystem path,
// not `new URL(...).pathname`, because the latter percent-encodes the `{ts,js}`
// braces and the glob then matches nothing.
const migrationsDir = path.dirname(fileURLToPath(import.meta.url));

export const dataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  entities: [User, Product, Category, Order, OrderItem, RefreshToken],
  migrations: [path.join(migrationsDir, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: isProduction ? ['error'] : ['error', 'warn'],
});
