import { Router } from 'express';
import type { UserController } from './controllers/user.controller.js';
import { authGuard } from '../../shared/middlewares/auth.middleware.js';
import { roleGuard } from '../../shared/middlewares/roles.middleware.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import { Role } from '../../shared/constants/roles.js';
import {
  idParamSchema,
  paginationQuerySchema,
} from '../../shared/validators/common.validator.js';
import {
  createUserSchema,
  updateUserSchema,
} from './validators/user.validator.js';

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User administration (ADMIN only)
 */
export const createUserRouter = (controller: UserController): Router => {
  const router = Router();

  // Every route in this module is admin-only: authenticate, then require ADMIN.
  router.use(authGuard, roleGuard(Role.ADMIN));

  /**
   * @swagger
   * /users:
   *   get:
   *     tags: [Users]
   *     summary: List users (paginated)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
   *     responses:
   *       200: { description: Paginated user list }
   *       401: { description: Unauthorized }
   *       403: { description: Forbidden }
   */
  router.get('/', validate({ query: paginationQuerySchema }), controller.list);

  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Get a user by id
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: User }
   *       404: { description: Not found }
   */
  router.get('/:id', validate({ params: idParamSchema }), controller.getById);

  /**
   * @swagger
   * /users:
   *   post:
   *     tags: [Users]
   *     summary: Create a user
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               name: { type: string }
   *               role: { type: string, enum: [ADMIN, USER] }
   *     responses:
   *       201: { description: Created }
   *       409: { description: Email already registered }
   */
  router.post('/', validate({ body: createUserSchema }), controller.create);

  /**
   * @swagger
   * /users/{id}:
   *   patch:
   *     tags: [Users]
   *     summary: Update a user
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name: { type: string }
   *               password: { type: string, minLength: 8 }
   *               role: { type: string, enum: [ADMIN, USER] }
   *     responses:
   *       200: { description: Updated }
   *       404: { description: Not found }
   */
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: updateUserSchema }),
    controller.update,
  );

  /**
   * @swagger
   * /users/{id}:
   *   delete:
   *     tags: [Users]
   *     summary: Soft-delete a user
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Deleted }
   *       404: { description: Not found }
   */
  router.delete('/:id', validate({ params: idParamSchema }), controller.remove);

  return router;
};
