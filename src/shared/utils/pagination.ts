import type { PaginatedResult, PaginationMeta } from '../http/api-response.js';

export interface PaginationParams {
  page: number;
  limit: number;
}

/** Convert page/limit into a TypeORM skip/take offset. */
export const toSkipTake = ({
  page,
  limit,
}: PaginationParams): { skip: number; take: number } => ({
  skip: (page - 1) * limit,
  take: limit,
});

export const buildMeta = (
  total: number,
  { page, limit }: PaginationParams,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const paginate = <T>(
  items: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> => ({ items, meta: buildMeta(total, params) });
