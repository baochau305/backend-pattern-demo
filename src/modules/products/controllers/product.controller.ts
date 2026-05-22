import { Router } from 'express';
import { productService } from '../services/product.service.js';
import { authGuard } from '../../../shared/middlewares/auth.js';
import { roleGuard } from '../../../shared/middlewares/roles.js';

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product management APIs
 */
export const productRouter = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     tags:
 *       - Products
 *     summary: List products
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Optional search query
 *     responses:
 *       200:
 *         description: Product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 */
productRouter.get('/', async (req, res) => {
  const data = await productService.list(req.query as Record<string, string>);
  res.json({ success: true, data });
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       404:
 *         description: Not found
 */
productRouter.get('/:id', async (req, res) => {
  const data = await productService.get(req.params.id);
  res.json({ success: true, data });
});

/**
 * @swagger
 * /products:
 *   post:
 *     tags:
 *       - Products
 *     summary: Create product (ADMIN only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
productRouter.post('/', authGuard, roleGuard('ADMIN'), async (req, res) => {
  const data = await productService.create(req.body);
  res.json({ success: true, data });
});
