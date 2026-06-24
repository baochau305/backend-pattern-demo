import { z } from 'zod';

/**
 * Reusable request fragments shared across modules (DRY validation).
 */

/** `:id` path param — must be a UUID. */
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

/**
 * Common pagination + sort query. `page`/`limit` are coerced from strings (all
 * query params arrive as strings) and bounded so a client cannot request an
 * unbounded page size. Returns typed numbers the services can use directly.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
