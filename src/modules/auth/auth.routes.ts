import { Router } from 'express';
import type { AuthController } from './controllers/auth.controller.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from './validators/auth.validator.js';

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Registration, login and token lifecycle
 */
export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, format: password, minLength: 8 }
   *               name: { type: string }
   *     responses:
   *       201: { description: User registered }
   *       409: { description: Email already registered }
   *       422: { description: Validation failed }
   */
  router.post(
    '/register',
    validate({ body: registerSchema }),
    controller.register,
  );

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Log in and receive an access/refresh token pair
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, format: password }
   *     responses:
   *       200: { description: Authenticated }
   *       401: { description: Invalid credentials }
   */
  router.post('/login', validate({ body: loginSchema }), controller.login);

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Rotate the refresh token and issue a new pair
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken: { type: string }
   *     responses:
   *       200: { description: New token pair }
   *       401: { description: Invalid/expired/revoked refresh token }
   */
  router.post(
    '/refresh',
    validate({ body: refreshSchema }),
    controller.refresh,
  );

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Revoke a refresh token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken: { type: string }
   *     responses:
   *       200: { description: Logged out }
   */
  router.post('/logout', validate({ body: logoutSchema }), controller.logout);

  return router;
};
