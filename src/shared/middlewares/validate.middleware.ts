import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/api-error.js';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/**
 * Request validation middleware.
 *
 * Validates and *coerces* the requested parts of the request (body/params/query)
 * against zod schemas. On success the parsed (typed, coerced) values are written
 * back onto the request so handlers receive clean data. On failure it raises a
 * single ValidationError whose `details` lists every offending field — turned into
 * a clean 422 response by the global error handler.
 *
 * `query`/`params` are not reassigned (some Express versions expose them as getters);
 * we mutate them in place so coerced values (e.g. page as a number) are visible.
 */
export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params)
        Object.assign(req.params, schemas.params.parse(req.params));
      if (schemas.query)
        Object.assign(req.query, schemas.query.parse(req.query));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        throw new ValidationError('Validation failed', details);
      }
      throw err;
    }
  };
