import { Router } from 'express';
import {
  authGuard,
  type AuthenticatedRequest,
} from '../../../shared/middlewares/auth.js';
import { orderService } from '../services/order.service.js';

export const orderRouter = Router();

orderRouter.post('/', authGuard, async (req: AuthenticatedRequest, res) => {
  const idemKey = req.header('Idempotency-Key') || undefined;
  const data = await orderService.create(req.user!.id, req.body.items, idemKey);
  res.json({ success: true, data });
});
