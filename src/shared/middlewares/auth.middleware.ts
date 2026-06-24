import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/api-error.js';
import type { Role } from '../constants/roles.js';

/** Claims encoded in the access token. */
export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

/**
 * Authentication guard: verifies the Bearer access token and attaches the
 * authenticated user to `req.user`. Any verification failure (missing/expired/
 * tampered token) results in a uniform 401 — we never leak the underlying reason.
 */
export const authGuard = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
};
