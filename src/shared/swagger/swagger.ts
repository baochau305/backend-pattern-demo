import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Builds the OpenAPI spec from the `@swagger` JSDoc blocks in the route files and
 * serves Swagger UI at /docs.
 *
 * `apis` scans both `src` (dev, run via tsx) and `dist` (compiled, production).
 * `removeComments: false` in tsconfig keeps the JSDoc in the emitted JS so the
 * spec is still generated when running from `dist`.
 */
export const setupSwagger = (app: Express): void => {
  const spec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'E-Commerce Backend API',
        version: '1.0.0',
        description:
          'Production-style e-commerce API: auth, RBAC, products, categories, ' +
          'orders with transactional stock handling, caching and queues.',
      },
      servers: [{ url: '/', description: 'Current host' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
    apis: ['./src/**/*.routes.{ts,js}', './dist/**/*.routes.js'],
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
  // Raw spec for tooling / client generation.
  app.get('/docs.json', (_req, res) => res.json(spec));
};
