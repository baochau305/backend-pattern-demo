import { Router } from 'express';
import type { OrderController } from './controllers/order.controller.js';
import { authGuard } from '../../shared/middlewares/auth.middleware.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import { idParamSchema } from '../../shared/validators/common.validator.js';
import {
  createOrderSchema,
  listOrderQuerySchema,
} from './validators/order.validator.js';

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Order placement and history
 */
export const createOrderRouter = (controller: OrderController): Router => {
  const router = Router();

  // All order routes require authentication; ownership is enforced in the controller.
  router.use(authGuard);

  /**
   * @swagger
   * /orders:
   *   post:
   *     tags: [Orders]
   *     summary: Create an order (decrements stock atomically)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *         description: Retrying with the same key returns the original order instead of creating a duplicate.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [items]
   *             properties:
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [productId, quantity]
   *                   properties:
   *                     productId: { type: string, format: uuid }
   *                     quantity: { type: integer, minimum: 1 }
   *     responses:
   *       201: { description: Order created }
   *       409: { description: Insufficient stock or duplicate idempotency key }
   *       401: { description: Unauthorized }
   */
  router.post('/', validate({ body: createOrderSchema }), controller.create);

  /**
   * @swagger
   * /orders:
   *   get:
   *     tags: [Orders]
   *     summary: List orders (own orders for USER, all orders for ADMIN)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
   *     responses:
   *       200: { description: Paginated order list }
   */
  router.get('/', validate({ query: listOrderQuerySchema }), controller.list);

  /**
   * @swagger
   * /orders/{id}:
   *   get:
   *     tags: [Orders]
   *     summary: Get an order by id (own order for USER, any for ADMIN)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Order }
   *       404: { description: Not found }
   */
  router.get('/:id', validate({ params: idParamSchema }), controller.getById);

  return router;
};
