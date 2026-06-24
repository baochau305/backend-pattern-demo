import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/api-error.js';
import type { Role } from '../constants/roles.js';

/**
 * RBAC guard factory. Use after `authGuard`:
 *   router.post('/', authGuard, roleGuard(Role.ADMIN), handler)
 *
 * Returns 401 if there is no authenticated user (guard mis-ordering / no token)
 * and 403 if the user is authenticated but lacks one of the allowed roles.
 */
export const roleGuard =
  (...allowed: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    if (!allowed.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
