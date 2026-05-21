import { redis } from '../redis/redis.js';
import { ApiError } from '../errors/api-error.js';

export const assertIdempotency = async (key?: string) => {
  if (!key) return;
  const exists = await redis.get(`idem:${key}`);
  if (exists)
    throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Duplicate request');
  await redis.set(`idem:${key}`, '1', { EX: 300 });
};
