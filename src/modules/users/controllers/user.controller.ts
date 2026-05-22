import { Router } from 'express';

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User management APIs
 */

export const userRouter = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List users
 *     responses:
 *       200:
 *         description: User list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 */
userRouter.get('/', (_req, res) => {
  res.json({ success: true, data: [] });
});
