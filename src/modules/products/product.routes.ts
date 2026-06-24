import { Router } from 'express';
import type { ProductController } from './controllers/product.controller.js';
import { authGuard } from '../../shared/middlewares/auth.middleware.js';
import { roleGuard } from '../../shared/middlewares/roles.middleware.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import { Role } from '../../shared/constants/roles.js';
import { idParamSchema } from '../../shared/validators/common.validator.js';
import {
  createProductSchema,
  listProductQuerySchema,
  updateProductSchema,
} from './validators/product.validator.js';

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product catalogue (public read, ADMIN write)
 */
export const createProductRouter = (controller: ProductController): Router => {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(Role.ADMIN)];

  /**
   * @swagger
   * /products:
   *   get:
   *     tags: [Products]
   *     summary: List products with pagination, search, category filter and sorting
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
   *       - { in: query, name: search, schema: { type: string }, description: "Case-insensitive name match" }
   *       - { in: query, name: category, schema: { type: string, format: uuid } }
   *       - in: query
   *         name: sort
   *         schema:
   *           type: string
   *           enum: [price_asc, price_desc, name_asc, name_desc, newest, oldest]
   *           default: newest
   *     responses:
   *       200: { description: Paginated product list }
   */
  router.get('/', validate({ query: listProductQuerySchema }), controller.list);

  /**
   * @swagger
   * /products/{id}:
   *   get:
   *     tags: [Products]
   *     summary: Get a product by id (cache-aside)
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Product }
   *       404: { description: Not found }
   */
  router.get('/:id', validate({ params: idParamSchema }), controller.getById);

  /**
   * @swagger
   * /products:
   *   post:
   *     tags: [Products]
   *     summary: Create a product (ADMIN)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, price, stock]
   *             properties:
   *               name: { type: string }
   *               description: { type: string }
   *               price: { type: number, format: float }
   *               stock: { type: integer }
   *               categoryId: { type: string, format: uuid }
   *     responses:
   *       201: { description: Created }
   *       403: { description: Forbidden }
   */
  router.post(
    '/',
    ...adminOnly,
    validate({ body: createProductSchema }),
    controller.create,
  );

  /**
   * @swagger
   * /products/{id}:
   *   patch:
   *     tags: [Products]
   *     summary: Update a product (ADMIN)
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
   *               price: { type: number }
   *               stock: { type: integer }
   *               categoryId: { type: string, format: uuid, nullable: true }
   *     responses:
   *       200: { description: Updated }
   *       404: { description: Not found }
   */
  router.patch(
    '/:id',
    ...adminOnly,
    validate({ params: idParamSchema, body: updateProductSchema }),
    controller.update,
  );

  /**
   * @swagger
   * /products/{id}:
   *   delete:
   *     tags: [Products]
   *     summary: Delete a product (ADMIN)
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
