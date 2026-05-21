import { dataSource } from '../../../shared/database/data-source.js';
import { orderRepo } from '../repositories/order.repository.js';
import { BadRequestError } from '../../../shared/errors/api-error.js';
import { assertIdempotency } from '../../../shared/utils/idempotency.js';
import { emailQueue } from '../../../shared/queue/queue.js';

export const orderService = {
  create: async (
    userId: string,
    items: Array<{ productId: string; quantity: number }>,
    idemKey?: string,
  ) => {
    await assertIdempotency(idemKey);

    return dataSource.transaction(async (manager) => {
      // Transaction + SELECT FOR UPDATE to avoid overselling.
      const order = manager.create(orderRepo.order.target, {
        user: { id: userId },
        items: [],
      });

      for (const item of items) {
        const product = await manager
          .getRepository(orderRepo.product.target)
          .createQueryBuilder('p')
          .setLock('pessimistic_write')
          .where('p.id = :id', { id: item.productId })
          .getOne();

        if (!product || product.stock < item.quantity)
          throw new BadRequestError('Insufficient stock');

        product.stock -= item.quantity;
        await manager.save(product);

        order.items.push(
          manager.create(orderRepo.item.target, {
            product,
            quantity: item.quantity,
          }),
        );
      }

      const saved = await manager.save(order);
      await emailQueue.add(
        'order-confirmation',
        { orderId: saved.id },
        { attempts: 3 },
      );
      return saved;
    });
  },
};
