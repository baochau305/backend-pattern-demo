import { Express } from 'express';
import swaggerUi from 'swagger-ui-express'; // Uses local module declaration in src/types to satisfy TS typings
import swaggerJsdoc from 'swagger-jsdoc'; // Uses local module declaration in src/types to satisfy TS typings

export const setupSwagger = (app: Express) => {
  const specs = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: { title: 'E-Commerce API', version: '1.0.0' },
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
      },
    },
    apis: [],
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
};
