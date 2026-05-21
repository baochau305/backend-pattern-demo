import { redis } from '../redis/redis.js';

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const value = await redis.get(key);
  return value ? (JSON.parse(value) as T) : null;
};

export const cacheSet = async (key: string, value: unknown, ttlSec: number) => {
  await redis.set(key, JSON.stringify(value), { EX: ttlSec });
};

export const cacheDel = async (key: string) => {
  await redis.del(key);
};
