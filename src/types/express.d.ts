import type { Role } from '../shared/constants/roles.js';

/**
 * Augment Express's Request with the authenticated principal so controllers and
 * the logger can read `req.user` in a type-safe way after the auth guard runs.
 */
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export {};
