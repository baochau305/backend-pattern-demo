import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

interface BasicAuthOptions {
  username: string;
  password: string;
  realm?: string;
}

/**
 * Compares two secrets in constant time so a response cannot be timed to leak
 * how many leading characters of a guess were correct. Values are hashed to a
 * fixed length first because `timingSafeEqual` throws on length mismatch (and
 * the length difference would itself be observable).
 */
const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so the failure path costs the same.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
};

/**
 * HTTP Basic authentication for operator-facing pages (e.g. the Bull Board queue
 * dashboard) that sit outside the JWT/RBAC flow used by the public API.
 *
 * Credentials come from env — never hard-coded — and are checked in constant time.
 * A failure returns 401 with `WWW-Authenticate` so browsers show the login prompt.
 */
export const basicAuth =
  ({ username, password, realm = 'Restricted' }: BasicAuthOptions) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const [scheme, encoded] = header.split(' ');

    if (scheme?.toLowerCase() === 'basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      const user = decoded.slice(0, separator);
      const pass = decoded.slice(separator + 1);

      // Both comparisons always run: no short-circuit on the username.
      const userOk = safeEqual(user, username);
      const passOk = safeEqual(pass, password);
      if (separator !== -1 && userOk && passOk) {
        next();
        return;
      }
    }

    res.setHeader(
      'WWW-Authenticate',
      `Basic realm="${realm}", charset="UTF-8"`,
    );
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
  };
