import type { Response } from 'express';

/**
 * Standard envelope for every response the API returns, so clients can rely on a
 * single, predictable shape.
 *
 * Success: { success: true, data, meta? }
 * Error:   { success: false, message, code, details? }  (produced by the error handler)
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export const ok = <T>(res: Response, data: T, status = 200): Response =>
  res.status(status).json({ success: true, data } satisfies SuccessResponse<T>);

export const created = <T>(res: Response, data: T): Response =>
  ok(res, data, 201);

export const paginated = <T>(
  res: Response,
  result: PaginatedResult<T>,
): Response =>
  res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  } satisfies SuccessResponse<T[]>);
