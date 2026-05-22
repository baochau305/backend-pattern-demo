import { Router } from 'express';
import {
  authGuard,
  type AuthenticatedRequest,
} from '../../../shared/middlewares/auth.js';
import { orderService } from '../services/order.service.js';

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Order management APIs
 */

export const orderRouter = Router();

/**
 * @swagger
 * /orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Create order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema: { type: string }
 *         required: false
 *         description: Prevent duplicate order creation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       200:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       401:
 *         description: Unauthorized
 */
orderRouter.post('/', authGuard, async (req: AuthenticatedRequest, res) => {
  const idemKey = req.header('Idempotency-Key') || undefined;
  const data = await orderService.create(req.user!.id, req.body.items, idemKey);
  res.json({ success: true, data });
});
