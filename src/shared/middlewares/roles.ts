import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/api-error.js';
import { AuthenticatedRequest } from './auth.js';
// import { type AuthenticatedRequest } from './auth.js';

export const roleGuard = (...roles: Array<'ADMIN' | 'USER'>) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) throw new ForbiddenError();
    next();
  };
};
