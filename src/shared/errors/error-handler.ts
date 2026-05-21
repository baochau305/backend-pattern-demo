import { Request, Response, NextFunction } from 'express';
import { ApiError } from './api-error.js';
import { logger } from '../logger/pino.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json({ success: false, message: err.message, code: err.code });
  }
  logger.error({ err });
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
  });
};
