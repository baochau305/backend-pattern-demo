import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors/api-error.js';

/** Terminal middleware for unmatched routes — yields the standard 404 envelope. */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};
