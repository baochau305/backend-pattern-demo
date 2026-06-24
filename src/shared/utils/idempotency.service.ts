import type { RedisClientType } from 'redis';
import { env } from '../config/env.js';
import { ConflictError } from '../errors/api-error.js';

interface IdempotencyRecord<T> {
  status: 'pending' | 'completed';
  result?: T;
}

/**
 * Idempotency for unsafe operations (e.g. order creation) keyed by an
 * `Idempotency-Key` header. Guarantees that retrying the same logical request
 * never performs the work twice:
 *
 *   - First request: atomically reserves the key (SET NX) and runs the operation,
 *     then stores the result.
 *   - A retry after completion: replays the stored result instead of re-running.
 *   - A concurrent retry still in flight: rejected with 409 so we never double-execute.
 *   - If the operation fails: the reservation is released so a genuine retry can proceed.
 */
export class IdempotencyService {
  constructor(
    private readonly client: RedisClientType,
    private readonly ttlSeconds: number = env.IDEMPOTENCY_TTL_SEC,
  ) {}

  async run<T>(
    key: string | undefined,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!key) return operation();

    const redisKey = `idem:${key}`;

    const existing = await this.client.get(redisKey);
    if (existing) {
      const record = JSON.parse(existing) as IdempotencyRecord<T>;
      if (record.status === 'completed') return record.result as T;
      throw new ConflictError(
        'A request with this Idempotency-Key is already being processed',
        'IDEMPOTENCY_IN_PROGRESS',
      );
    }

    const reserved = await this.client.set(
      redisKey,
      JSON.stringify({ status: 'pending' } satisfies IdempotencyRecord<T>),
      { NX: true, EX: this.ttlSeconds },
    );
    if (!reserved) {
      // Lost the race to another concurrent request holding the same key.
      throw new ConflictError('Duplicate request', 'IDEMPOTENCY_CONFLICT');
    }

    try {
      const result = await operation();
      await this.client.set(
        redisKey,
        JSON.stringify({ status: 'completed', result }),
        { EX: this.ttlSeconds },
      );
      return result;
    } catch (err) {
      await this.client.del(redisKey);
      throw err;
    }
  }
}
