import { OrderService } from '../src/modules/orders/services/order.service.js';
import { OrderStatus } from '../src/modules/orders/constants/order-status.js';
import { NotFoundError } from '../src/shared/errors/api-error.js';
import type { DataSource, EntityManager } from 'typeorm';
import type { OrderRepository } from '../src/modules/orders/repositories/order.repository.js';
import type { ProductRepository } from '../src/modules/products/repositories/product.repository.js';
import type { IdempotencyService } from '../src/shared/utils/idempotency.service.js';
import type { QueuePublisher } from '../src/shared/queue/queue.publisher.js';
import type { Product } from '../src/modules/products/entities/product.entity.js';
import type { Order } from '../src/modules/orders/entities/order.entity.js';

const makeProduct = (overrides: Partial<Product>): Product =>
  ({
    id: 'p1',
    name: 'Widget',
    price: 100,
    stock: 10,
    ...overrides,
  }) as Product;

describe('OrderService', () => {
  let dataSource: jest.Mocked<DataSource>;
  let orders: jest.Mocked<OrderRepository>;
  let products: jest.Mocked<ProductRepository>;
  let idempotency: jest.Mocked<IdempotencyService>;
  let queue: jest.Mocked<QueuePublisher>;
  let service: OrderService;
  const manager = {} as EntityManager;

  beforeEach(() => {
    dataSource = {
      // Run the callback immediately with a fake manager, like a real transaction.
      transaction: jest.fn((cb: (m: EntityManager) => unknown) => cb(manager)),
    } as unknown as jest.Mocked<DataSource>;

    orders = {
      createInTransaction: jest.fn(),
      findById: jest.fn(),
      findByIdForUser: jest.fn(),
      findAndCountByUser: jest.fn(),
      findAndCountAll: jest.fn(),
    } as unknown as jest.Mocked<OrderRepository>;

    products = {
      lockById: jest.fn(),
      saveInTransaction: jest.fn((_m, product: Product) =>
        Promise.resolve(product),
      ),
    } as unknown as jest.Mocked<ProductRepository>;

    idempotency = {
      // Pass-through: invoke the wrapped operation directly.
      run: jest.fn((_key: string | undefined, op: () => unknown) => op()),
    } as unknown as jest.Mocked<IdempotencyService>;

    queue = {
      orderConfirmation: jest.fn().mockResolvedValue(undefined),
      analyticsEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<QueuePublisher>;

    service = new OrderService(
      dataSource,
      orders,
      products,
      idempotency,
      queue,
    );
  });

  const stubCreatedOrder = (
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      name: string;
    }>,
    total: number,
  ): void => {
    orders.createInTransaction.mockResolvedValue({ id: 'o1' } as Order);
    orders.findById.mockResolvedValue({
      id: 'o1',
      userId: 'u1',
      status: OrderStatus.PENDING,
      total,
      createdAt: new Date('2024-01-01'),
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        product: { name: i.name },
      })),
    } as unknown as Order);
  };

  describe('create', () => {
    it('decrements stock, computes the total, and persists the order', async () => {
      products.lockById.mockResolvedValue(
        makeProduct({ stock: 10, price: 100 }),
      );
      stubCreatedOrder(
        [{ productId: 'p1', quantity: 2, unitPrice: 100, name: 'Widget' }],
        200,
      );

      const result = await service.create('u1', {
        items: [{ productId: 'p1', quantity: 2 }],
      });

      // Stock decremented from 10 -> 8 and saved inside the transaction.
      const savedProduct = products.saveInTransaction.mock.calls[0][1];
      expect(savedProduct.stock).toBe(8);

      // Order persisted with the correct total and unit price snapshot.
      const created = orders.createInTransaction.mock.calls[0][1];
      expect(created.total).toBe(200);
      expect(created.items).toEqual([
        { productId: 'p1', quantity: 2, unitPrice: 100 },
      ]);

      expect(result.total).toBe(200);
      expect(result.items[0].lineTotal).toBe(200);
      expect(queue.orderConfirmation).toHaveBeenCalledWith({
        orderId: 'o1',
        userId: 'u1',
      });
    });

    it('prevents overselling: rejects when stock is insufficient and never creates the order', async () => {
      products.lockById.mockResolvedValue(makeProduct({ stock: 1 }));

      await expect(
        service.create('u1', { items: [{ productId: 'p1', quantity: 2 }] }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });

      expect(orders.createInTransaction).not.toHaveBeenCalled();
      expect(queue.orderConfirmation).not.toHaveBeenCalled();
    });

    it('throws NotFound when a product does not exist', async () => {
      products.lockById.mockResolvedValue(null);
      await expect(
        service.create('u1', { items: [{ productId: 'p1', quantity: 1 }] }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('merges duplicate line items so the row is locked once and stock is summed', async () => {
      products.lockById.mockResolvedValue(makeProduct({ stock: 5, price: 50 }));
      stubCreatedOrder(
        [{ productId: 'p1', quantity: 3, unitPrice: 50, name: 'Widget' }],
        150,
      );

      await service.create('u1', {
        items: [
          { productId: 'p1', quantity: 1 },
          { productId: 'p1', quantity: 2 },
        ],
      });

      expect(products.lockById).toHaveBeenCalledTimes(1);
      const savedProduct = products.saveInTransaction.mock.calls[0][1];
      expect(savedProduct.stock).toBe(2); // 5 - (1 + 2)
      const created = orders.createInTransaction.mock.calls[0][1];
      expect(created.items).toEqual([
        { productId: 'p1', quantity: 3, unitPrice: 50 },
      ]);
    });

    it('runs inside the idempotency guard using the provided key', async () => {
      products.lockById.mockResolvedValue(makeProduct({ stock: 10 }));
      stubCreatedOrder(
        [{ productId: 'p1', quantity: 1, unitPrice: 100, name: 'Widget' }],
        100,
      );

      await service.create(
        'u1',
        { items: [{ productId: 'p1', quantity: 1 }] },
        'key-123',
      );

      expect(idempotency.run).toHaveBeenCalledWith(
        'key-123',
        expect.any(Function),
      );
    });

    it('still succeeds if enqueuing side-effects fails (order already committed)', async () => {
      products.lockById.mockResolvedValue(makeProduct({ stock: 10 }));
      stubCreatedOrder(
        [{ productId: 'p1', quantity: 1, unitPrice: 100, name: 'Widget' }],
        100,
      );
      queue.orderConfirmation.mockRejectedValue(new Error('redis down'));

      await expect(
        service.create('u1', { items: [{ productId: 'p1', quantity: 1 }] }),
      ).resolves.toMatchObject({ id: 'o1' });
    });
  });

  describe('getByIdForUser', () => {
    it('throws NotFound when the order is not owned by the user', async () => {
      orders.findByIdForUser.mockResolvedValue(null);
      await expect(service.getByIdForUser('o1', 'u1')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
