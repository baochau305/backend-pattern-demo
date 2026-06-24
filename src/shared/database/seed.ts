import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { dataSource } from './data-source.js';
import { logger } from '../logger/pino.js';
import { Role } from '../constants/roles.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { Category } from '../../modules/categories/entities/category.entity.js';
import { Product } from '../../modules/products/entities/product.entity.js';

/**
 * Idempotent seed: safe to run repeatedly (skips rows that already exist) so it
 * can be wired into container startup or run manually after migrations.
 */
const run = async (): Promise<void> => {
  await dataSource.initialize();
  const users = dataSource.getRepository(User);
  const categories = dataSource.getRepository(Category);
  const products = dataSource.getRepository(Product);

  const ensureUser = async (
    email: string,
    password: string,
    role: Role,
    name: string,
  ): Promise<void> => {
    if (await users.findOne({ where: { email } })) return;
    await users.save(
      users.create({
        email,
        name,
        role,
        passwordHash: await bcrypt.hash(password, 10),
      }),
    );
  };

  await ensureUser('admin@example.com', 'Admin@123', Role.ADMIN, 'Admin');
  await ensureUser('user@example.com', 'User@1234', Role.USER, 'Demo User');

  const ensureCategory = async (
    name: string,
    description: string,
  ): Promise<Category> => {
    const existing = await categories.findOne({ where: { name } });
    if (existing) return existing;
    return categories.save(categories.create({ name, description }));
  };

  const electronics = await ensureCategory(
    'Electronics',
    'Gadgets and devices',
  );
  const books = await ensureCategory('Books', 'Paperbacks and e-books');

  const ensureProduct = async (
    name: string,
    price: number,
    stock: number,
    category: Category,
  ): Promise<void> => {
    if (await products.findOne({ where: { name } })) return;
    await products.save(
      products.create({ name, price, stock, categoryId: category.id }),
    );
  };

  await ensureProduct('Laptop', 1200, 10, electronics);
  await ensureProduct('Wireless Mouse', 25.5, 100, electronics);
  await ensureProduct('Mechanical Keyboard', 80, 1, electronics); // stock=1 to demo race conditions
  await ensureProduct('Clean Architecture', 32.99, 50, books);

  await dataSource.destroy();
  logger.info('Seed complete');
};

run().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
