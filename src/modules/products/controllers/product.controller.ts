import { Router } from 'express';
import { productService } from '../services/product.service.js';
import { authGuard } from '../../../shared/middlewares/auth.js';
import { roleGuard } from '../../../shared/middlewares/roles.js';

export const productRouter = Router();

productRouter.get('/', async (req, res) => {
  const data = await productService.list(req.query as Record<string, string>);
  res.json({ success: true, data });
});

productRouter.get('/:id', async (req, res) => {
  const data = await productService.get(req.params.id);
  res.json({ success: true, data });
});

productRouter.post('/', authGuard, roleGuard('ADMIN'), async (req, res) => {
  const data = await productService.create(req.body);
  res.json({ success: true, data });
});
