import type { Request, Response, NextFunction } from 'express';
import type { RedisClientType } from 'redis';
import { env } from '../config/env.js';
import { TooManyRequestsError } from '../errors/api-error.js';

interface RateLimitOptions {
  max?: number;
  windowSec?: number;
}

/**
 * Per-IP sliding-window rate limiter backed by a Redis sorted set.
 *
 * Algorithm (atomic via MULTI):
 *   1. Drop timestamps older than the window (ZREMRANGEBYSCORE).
 *   2. Record this request's timestamp (ZADD).
 *   3. Count requests remaining in the window (ZCARD).
 *   4. Set a TTL so idle keys are reclaimed.
 * If the count exceeds `max`, respond 429 with a Retry-After hint.
 *
 * A true sliding window (vs fixed buckets) prevents the burst-at-boundary problem
 * where 2x the limit can slip through around a window edge. The Redis client is
 * injected so the limiter is configurable and testable.
 */
export const rateLimit =
  (client: RedisClientType, options: RateLimitOptions = {}) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const max = options.max ?? env.RATE_LIMIT_MAX;
    const windowSec = options.windowSec ?? env.RATE_LIMIT_WINDOW_SEC;
    const now = Date.now();
    const key = `rl:${req.ip}`;

    const tx = client.multi();
    tx.zRemRangeByScore(key, 0, now - windowSec * 1000);
    tx.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    tx.zCard(key);
    tx.expire(key, windowSec);
    const results = await tx.exec();

    const count = Number(results?.[2] ?? 0);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));

    if (count > max) {
      res.setHeader('Retry-After', windowSec);
      throw new TooManyRequestsError();
    }
    next();
  };
