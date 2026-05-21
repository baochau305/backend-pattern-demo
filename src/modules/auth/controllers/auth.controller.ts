import { Router } from 'express';
import { authService } from '../services/auth.service.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { BadRequestError } from '../../../shared/errors/api-error.js';

export const authRouter = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Server error
 */
authRouter.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) throw new BadRequestError('Validation failed');
  const data = await authService.register(
    result.data.email,
    result.data.password,
  );
  res.json({ success: true, data });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       400:
 *         description: Validation failed
 */
authRouter.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) throw new BadRequestError('Validation failed');
  const data = await authService.login(result.data.email, result.data.password);
  res.json({ success: true, data });
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       400:
 *         description: Missing refresh token
 */
authRouter.post('/refresh', async (req, res) => {
  const token = req.body?.refreshToken as string;
  if (!token) throw new BadRequestError('Missing refresh token');
  const data = await authService.refresh(token);
  res.json({ success: true, data });
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout and invalidate refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       400:
 *         description: Missing refresh token
 */
authRouter.post('/logout', async (req, res) => {
  const token = req.body?.refreshToken as string;
  if (!token) throw new BadRequestError('Missing refresh token');
  await authService.logout(token);
  res.json({ success: true, data: {} });
});
