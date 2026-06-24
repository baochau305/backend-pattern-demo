import type { DataSource } from 'typeorm';
import type { OrderRepository } from '../repositories/order.repository.js';
import type { ProductRepository } from '../../products/repositories/product.repository.js';
import type { IdempotencyService } from '../../../shared/utils/idempotency.service.js';
import type { QueuePublisher } from '../../../shared/queue/queue.publisher.js';
import { logger } from '../../../shared/logger/pino.js';
import {
  ConflictError,
  NotFoundError,
} from '../../../shared/errors/api-error.js';
import { paginate } from '../../../shared/utils/pagination.js';
import type { PaginationParams } from '../../../shared/utils/pagination.js';
import type { PaginatedResult } from '../../../shared/http/api-response.js';
import type { Order } from '../entities/order.entity.js';
import type { CreateOrderDto, OrderDto } from '../dtos/order.dto.js';
import type { NewOrderItem } from '../repositories/order.repository.js';

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Order business logic, including safe stock handling under concurrency.
 */
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly idempotency: IdempotencyService,
    private readonly queue: QueuePublisher,
  ) {}

  /**
   * Create an order while preventing overselling.
   *
   * Concurrency model — why this is correct even when two users race for the last
   * unit in stock:
   *
   *   1. The whole thing runs in a DB transaction, so stock decrements and the
   *      order/items insert either all commit or all roll back.
   *   2. For each product we issue `SELECT ... FOR UPDATE` (pessimistic write lock)
   *      via `productRepository.lockById`. The first transaction to reach a given
   *      row holds the lock; any concurrent transaction wanting that row BLOCKS
   *      until the first commits, then reads the *already decremented* stock and
   *      sees there is nothing left — so it fails the stock check instead of
   *      double-selling.
   *   3. Rows are locked in a deterministic order (sorted by id) so two orders
   *      touching the same set of products can never deadlock by grabbing locks
   *      in opposite orders.
   *
   * The operation is also wrapped in an idempotency guard so a retried request
   * (same Idempotency-Key) returns the original order instead of creating another.
   */
  async create(
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey?: string,
  ): Promise<OrderDto> {
    return this.idempotency.run(idempotencyKey, async () => {
      // Merge duplicate product lines so each row is locked exactly once.
      const quantities = new Map<string, number>();
      for (const item of dto.items) {
        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) + item.quantity,
        );
      }
      const productIds = [...quantities.keys()].sort();

      const order = await this.dataSource.transaction(async (manager) => {
        const items: NewOrderItem[] = [];
        let total = 0;

        for (const productId of productIds) {
          const quantity = quantities.get(productId) as number;
          const product = await this.products.lockById(manager, productId);
          if (!product)
            throw new NotFoundError(`Product ${productId} not found`);

          if (product.stock < quantity) {
            throw new ConflictError(
              `Insufficient stock for "${product.name}" (requested ${quantity}, available ${product.stock})`,
              'INSUFFICIENT_STOCK',
            );
          }

          product.stock -= quantity;
          await this.products.saveInTransaction(manager, product);

          total += product.price * quantity;
          items.push({ productId, quantity, unitPrice: product.price });
        }

        return this.orders.createInTransaction(manager, {
          userId,
          total: round2(total),
          items,
        });
      });

      // Side effects happen AFTER commit: we must never email/track an order that
      // ultimately rolled back. A queue hiccup must not fail an already-placed
      // order, so failures here are logged, not thrown.
      await this.publishSideEffects(order.id, userId);

      const full = await this.orders.findById(order.id);
      return this.toDto(full ?? order);
    });
  }

  async getByIdForUser(orderId: string, userId: string): Promise<OrderDto> {
    const order = await this.orders.findByIdForUser(orderId, userId);
    if (!order) throw new NotFoundError('Order not found');
    return this.toDto(order);
  }

  /** Admin lookup with no ownership restriction. */
  async getByIdAsAdmin(orderId: string): Promise<OrderDto> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    return this.toDto(order);
  }

  async listForUser(
    userId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<OrderDto>> {
    const [items, total] = await this.orders.findAndCountByUser(userId, params);
    return paginate(
      items.map((order) => this.toDto(order)),
      total,
      params,
    );
  }

  async listAll(params: PaginationParams): Promise<PaginatedResult<OrderDto>> {
    const [items, total] = await this.orders.findAndCountAll(params);
    return paginate(
      items.map((order) => this.toDto(order)),
      total,
      params,
    );
  }

  private async publishSideEffects(
    orderId: string,
    userId: string,
  ): Promise<void> {
    try {
      await Promise.all([
        this.queue.orderConfirmation({ orderId, userId }),
        this.queue.analyticsEvent({
          event: 'order.created',
          userId,
          properties: { orderId },
          timestamp: new Date().toISOString(),
        }),
      ]);
    } catch (err) {
      logger.error({ err, orderId }, 'Failed to enqueue order side-effects');
    }
  }

  private toDto(order: Order): OrderDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product?.name ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: round2(item.unitPrice * item.quantity),
      })),
    };
  }
}
