import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { QueryFailedError } from 'typeorm';
import jwt from 'jsonwebtoken';
import { ApiError } from './api-error.js';
import { isProduction } from '../config/env.js';
import { logger } from '../logger/pino.js';

interface ErrorBody {
  success: false;
  message: string;
  code: string;
  details?: unknown;
}

/**
 * Single global error handler — the only place that turns thrown errors into HTTP
 * responses. Combined with `express-async-errors`, throwing anywhere (including in
 * async handlers) routes here.
 *
 * Mapping strategy:
 *   - ApiError        -> use its status/code/message/details (our intentional errors).
 *   - ZodError        -> 422 with field details (defensive; validate() normally handles this).
 *   - JWT errors      -> 401.
 *   - QueryFailedError-> 409 for unique-violation, otherwise an opaque 500.
 *   - anything else   -> 500, details/stack hidden in production so internals never leak.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // next is required for Express to recognise this as an error handler.
  _next: NextFunction,
): Response<ErrorBody> => {
  const log = req.log ?? logger;

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) log.error({ err }, err.message);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  if (err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  if (err instanceof jwt.JsonWebTokenError) {
    return res
      .status(401)
      .json({ success: false, message: 'Invalid token', code: 'UNAUTHORIZED' });
  }

  if (err instanceof QueryFailedError) {
    log.error({ err }, 'Database query failed');
    // 23505 = unique_violation in PostgreSQL.
    const code = (err.driverError as { code?: string } | undefined)?.code;
    if (code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Database error',
      code: 'DATABASE_ERROR',
    });
  }

  // Unknown/unexpected error: log everything server-side, expose nothing sensitive.
  log.error({ err }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    message: isProduction
      ? 'Internal Server Error'
      : err instanceof Error
        ? err.message
        : 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    ...(isProduction || !(err instanceof Error)
      ? {}
      : { details: { stack: err.stack } }),
  });
};
