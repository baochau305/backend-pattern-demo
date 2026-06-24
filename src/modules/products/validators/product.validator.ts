import { z } from 'zod';

export const createProductSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).optional(),
    price: z.number().nonnegative().finite(),
    stock: z.number().int().min(0),
    categoryId: z.string().uuid().optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(5000).optional(),
    price: z.number().nonnegative().finite().optional(),
    stock: z.number().int().min(0).optional(),
    categoryId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

/**
 * Product listing query: pagination + filtering (search/category) + sorting.
 * page/limit are coerced from strings; `sort` is constrained to a safe whitelist
 * so user input can never reach the ORDER BY clause directly (no SQL injection).
 */
export const listProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(255).optional(),
  category: z.string().uuid().optional(),
  sort: z
    .enum([
      'price_asc',
      'price_desc',
      'name_asc',
      'name_desc',
      'newest',
      'oldest',
    ])
    .default('newest'),
});

export type ListProductQuery = z.infer<typeof listProductQuerySchema>;
