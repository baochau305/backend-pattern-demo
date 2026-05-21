import { Request, Response, NextFunction } from 'express';
import { redis } from '../redis/redis.js';
import { ApiError } from '../errors/api-error.js';

export const rateLimit = () => {
  const max = Number(process.env.RATE_LIMIT_MAX || 100);
  const windowSec = Number(process.env.RATE_LIMIT_WINDOW_SEC || 60);

  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = `rl:${req.ip}`;
    const now = Date.now();
    // Sliding window: keep timestamps within windowSec.
    const tx = redis.multi();
    tx.zRemRangeByScore(key, 0, now - windowSec * 1000);
    tx.zAdd(key, { score: now, value: `${now}` });
    tx.zCard(key);
    tx.expire(key, windowSec);
    const [, , count] = (await tx.exec()) ?? [];
    if (Number(count) > max)
      throw new ApiError(429, 'RATE_LIMIT', 'Too many requests');
    next();
  };
};
