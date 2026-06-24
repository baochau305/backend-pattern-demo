import { z } from 'zod';

export const createOrderSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.string().uuid(),
            quantity: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1, 'An order must contain at least one item')
      .max(100, 'Too many items in a single order'),
  })
  .strict();

export const listOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListOrderQuery = z.infer<typeof listOrderQuerySchema>;
