import { Router } from 'express';
import type { CategoryController } from './controllers/category.controller.js';
import { authGuard } from '../../shared/middlewares/auth.middleware.js';
import { roleGuard } from '../../shared/middlewares/roles.middleware.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import { Role } from '../../shared/constants/roles.js';
import {
  idParamSchema,
  paginationQuerySchema,
} from '../../shared/validators/common.validator.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from './validators/category.validator.js';

/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: Product categories (public read, ADMIN write)
 */
export const createCategoryRouter = (
  controller: CategoryController,
): Router => {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(Role.ADMIN)];

  /**
   * @swagger
   * /categories:
   *   get:
   *     tags: [Categories]
   *     summary: List categories (paginated)
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
   *     responses:
   *       200: { description: Paginated category list }
   */
  router.get('/', validate({ query: paginationQuerySchema }), controller.list);

  /**
   * @swagger
   * /categories/{id}:
   *   get:
   *     tags: [Categories]
   *     summary: Get a category by id
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Category }
   *       404: { description: Not found }
   */
  router.get('/:id', validate({ params: idParamSchema }), controller.getById);

  /**
   * @swagger
   * /categories:
   *   post:
   *     tags: [Categories]
   *     summary: Create a category (ADMIN)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string }
   *               description: { type: string }
   *     responses:
   *       201: { description: Created }
   *       403: { description: Forbidden }
   */
  router.post(
    '/',
    ...adminOnly,
    validate({ body: createCategorySchema }),
    controller.create,
  );

  /**
   * @swagger
   * /categories/{id}:
   *   patch:
   *     tags: [Categories]
   *     summary: Update a category (ADMIN)
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
   *               description: { type: string }
   *     responses:
   *       200: { description: Updated }
   *       404: { description: Not found }
   */
  router.patch(
    '/:id',
    ...adminOnly,
    validate({ params: idParamSchema, body: updateCategorySchema }),
    controller.update,
  );

  /**
   * @swagger
   * /categories/{id}:
   *   delete:
   *     tags: [Categories]
   *     summary: Delete a category (ADMIN)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Deleted }
   *       404: { description: Not found }
   */
  router.delete(
    '/:id',
    ...adminOnly,
    validate({ params: idParamSchema }),
    controller.remove,
  );

  return router;
};
