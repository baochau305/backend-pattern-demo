import type { ConnectionOptions } from 'bullmq';
import { env } from '../config/env.js';

/**
 * BullMQ requires its own Redis connection (it cannot share the node-redis client
 * used for caching) and mandates `maxRetriesPerRequest: null` for blocking commands.
 * We derive the connection from REDIS_URL so there is a single source of truth.
 */
const url = new URL(env.REDIS_URL);

export const queueConnection: ConnectionOptions = {
  host: url.hostname,
  port: Number(url.port || 6379),
  username: url.username || undefined,
  password: url.password || undefined,
  maxRetriesPerRequest: null,
};
