import { Router } from 'express';

/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: Category management APIs
 */

export const categoryRouter = Router();

/**
 * @swagger
 * /categories:
 *   get:
 *     tags:
 *       - Categories
 *     summary: List categories
 *     responses:
 *       200:
 *         description: Category list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 */
categoryRouter.get('/', (_req, res) => {
  res.json({ success: true, data: [] });
});
