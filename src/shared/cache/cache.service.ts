import type { RedisClientType } from 'redis';

/**
 * Thin Redis-backed cache used to implement the cache-aside pattern.
 *
 * Cache-aside flow (see ProductService):
 *   1. Read from cache.
 *   2. On miss, read from the database.
 *   3. Populate the cache with a TTL and return.
 * On writes the relevant keys are invalidated so stale data is never served.
 *
 * The Redis client is injected (constructor DI) so the service is trivial to mock
 * in unit tests and has no hidden global dependency.
 */
export class CacheService {
  constructor(private readonly client: RedisClientType) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Delete every key matching a glob pattern (e.g. `products:list:*`).
   *
   * Redis `DEL` does NOT understand patterns, so we iterate with non-blocking
   * `SCAN` (never `KEYS`, which blocks the server on large datasets) and delete
   * matches in batches. This is what makes list-cache invalidation correct.
   */
  async delByPattern(pattern: string): Promise<void> {
    const keys: string[] = [];
    for await (const key of this.client.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(...(Array.isArray(key) ? key : [key]));
    }
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}
