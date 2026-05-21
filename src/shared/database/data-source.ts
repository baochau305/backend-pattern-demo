import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity.js';
import { Product } from '../../modules/products/entities/product.entity.js';
import { Category } from '../../modules/categories/entities/category.entity.js';
import { Order } from '../../modules/orders/entities/order.entity.js';
import { OrderItem } from '../../modules/orders/entities/order-item.entity.js';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity.js';

export const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Product, Category, Order, OrderItem, RefreshToken],
  synchronize: false,
  migrations: [new URL('./migrations/*.{ts,js}', import.meta.url).pathname],
});
