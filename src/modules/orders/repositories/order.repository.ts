import type { DataSource, EntityManager, Repository } from 'typeorm';
import { Order } from '../entities/order.entity.js';
import { OrderStatus } from '../constants/order-status.js';
import type { PaginationParams } from '../../../shared/utils/pagination.js';

export interface NewOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface NewOrder {
  userId: string;
  total: number;
  items: NewOrderItem[];
}

export class OrderRepository {
  private readonly repo: Repository<Order>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Order);
  }

  /** Full order graph (items + their products) for response mapping. */
  findById(id: string): Promise<Order | null> {
    return this.repo.findOne({
      where: { id },
      relations: { items: { product: true } },
    });
  }

  /** Scoped lookup so a USER can only ever read their own order. */
  findByIdForUser(id: string, userId: string): Promise<Order | null> {
    return this.repo.findOne({
      where: { id, userId },
      relations: { items: { product: true } },
    });
  }

  findAndCountByUser(
    userId: string,
    params: PaginationParams,
  ): Promise<[Order[], number]> {
    return this.repo.findAndCount({
      where: { userId },
      relations: { items: { product: true } },
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    });
  }

  findAndCountAll(params: PaginationParams): Promise<[Order[], number]> {
    return this.repo.findAndCount({
      relations: { items: { product: true } },
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    });
  }

  /**
   * Persist an order and its line items inside the caller's transaction.
   * `cascade: true` on Order.items means saving the order also inserts the items
   * atomically — they commit or roll back together with the stock decrements.
   */
  createInTransaction(manager: EntityManager, data: NewOrder): Promise<Order> {
    const repo = manager.getRepository(Order);
    const order = repo.create({
      userId: data.userId,
      total: data.total,
      status: OrderStatus.PENDING,
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
    return repo.save(order);
  }
}
