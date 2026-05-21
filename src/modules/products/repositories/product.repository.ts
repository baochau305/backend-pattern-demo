import { dataSource } from '../../../shared/database/data-source.js';
import { Product } from '../entities/product.entity.js';

export const productRepo = dataSource.getRepository(Product);
