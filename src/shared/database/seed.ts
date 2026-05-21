import bcrypt from 'bcryptjs';
import { dataSource } from './data-source.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { Category } from '../../modules/categories/entities/category.entity.js';
import { Product } from '../../modules/products/entities/product.entity.js';

const run = async () => {
  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);
  const categoryRepo = dataSource.getRepository(Category);
  const productRepo = dataSource.getRepository(Product);

  const admin = await userRepo.save(
    userRepo.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      role: 'ADMIN',
    }),
  );

  const electronics = await categoryRepo.save(
    categoryRepo.create({ name: 'Electronics' }),
  );
  await productRepo.save(
    productRepo.create({
      name: 'Laptop',
      price: 1200,
      stock: 10,
      category: electronics,
    }),
  );

  await dataSource.destroy();
};

run();
