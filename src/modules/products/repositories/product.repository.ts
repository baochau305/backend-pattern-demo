import type { DataSource, EntityManager, Repository } from 'typeorm';
import { Product } from '../entities/product.entity.js';
import type { ProductSearchParams, ProductSort } from '../dtos/product.dto.js';

export interface ProductData {
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  categoryId?: string | null;
}

/** Whitelisted sort -> (column, direction). Keeps user input out of ORDER BY. */
const SORT_MAP: Record<
  ProductSort,
  { column: string; direction: 'ASC' | 'DESC' }
> = {
  price_asc: { column: 'product.price', direction: 'ASC' },
  price_desc: { column: 'product.price', direction: 'DESC' },
  name_asc: { column: 'product.name', direction: 'ASC' },
  name_desc: { column: 'product.name', direction: 'DESC' },
  newest: { column: 'product.createdAt', direction: 'DESC' },
  oldest: { column: 'product.createdAt', direction: 'ASC' },
};

export class ProductRepository {
  private readonly repo: Repository<Product>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Product);
  }

  findById(id: string): Promise<Product | null> {
    return this.repo.findOne({ where: { id }, relations: { category: true } });
  }

  /**
   * Paginated search with optional name filter, category filter and sorting.
   * Uses a QueryBuilder with bound parameters (never string interpolation) and
   * returns the page plus the total count for pagination metadata.
   */
  async search(params: ProductSearchParams): Promise<[Product[], number]> {
    const qb = this.repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    if (params.search) {
      qb.andWhere('product.name ILIKE :search', {
        search: `%${params.search}%`,
      });
    }
    if (params.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: params.categoryId,
      });
    }

    const { column, direction } = SORT_MAP[params.sort];
    qb.orderBy(column, direction)
      .skip((params.page - 1) * params.limit)
      .take(params.limit);

    return qb.getManyAndCount();
  }

  create(data: ProductData): Promise<Product> {
    return this.repo.save(this.repo.create(data));
  }

  async update(
    id: string,
    data: Partial<ProductData>,
  ): Promise<Product | null> {
    await this.repo.update({ id }, data);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repo.softDelete({ id });
    return result.affected === 1;
  }

  // --- transaction-scoped helpers (unit of work) ---------------------------
  // These take the active EntityManager so they participate in the caller's
  // transaction. They are the only correct way to mutate stock safely.

  /**
   * Lock a product row for update within the current transaction.
   *
   * `setLock('pessimistic_write')` emits `SELECT ... FOR UPDATE`, so a concurrent
   * transaction that wants the same row BLOCKS until this one commits/rolls back.
   * This serialises stock checks and is what prevents overselling the last item.
   */
  lockById(manager: EntityManager, id: string): Promise<Product | null> {
    return manager
      .getRepository(Product)
      .createQueryBuilder('product')
      .setLock('pessimistic_write')
      .where('product.id = :id', { id })
      .getOne();
  }

  saveInTransaction(
    manager: EntityManager,
    product: Product,
  ): Promise<Product> {
    return manager.getRepository(Product).save(product);
  }
}
