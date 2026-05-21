import { dataSource } from '../../../shared/database/data-source.js';
import { Order } from '../entities/order.entity.js';
import { OrderItem } from '../entities/order-item.entity.js';
import { Product } from '../../products/entities/product.entity.js';

export const orderRepo = {
  order: dataSource.getRepository(Order),
  item: dataSource.getRepository(OrderItem),
  product: dataSource.getRepository(Product),
};
