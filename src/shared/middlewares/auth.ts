import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/api-error.js';

export interface AuthPayload {
  sub: string;
  role: 'ADMIN' | 'USER';
}

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: 'ADMIN' | 'USER' };
}

export const authGuard = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError();

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as AuthPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new UnauthorizedError();
  }
};
