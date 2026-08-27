import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralised, type-safe configuration.
 *
 * Every environment variable the app needs is declared and validated here once,
 * at startup. If something required is missing or malformed the process exits
 * immediately with a readable error instead of failing later in a random place.
 * The rest of the codebase imports the typed `env` object and never touches
 * `process.env` directly.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgres://postgres:postgres@localhost:5432/app'),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required').default('change_me'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(60),

  CACHE_TTL_LIST_SEC: z.coerce.number().int().positive().default(60),
  CACHE_TTL_DETAIL_SEC: z.coerce.number().int().positive().default(120),

  IDEMPOTENCY_TTL_SEC: z.coerce.number().int().positive().default(86400),

  // ---- Bull Board (queue dashboard, HTTP Basic auth) ----
  BULL_BOARD_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  BULL_BOARD_PATH: z
    .string()
    .startsWith('/', 'BULL_BOARD_PATH must start with "/"')
    .default('/admin/queues'),
  BULL_BOARD_USERNAME: z.string().min(1).default('admin'),
  BULL_BOARD_PASSWORD: z.string().min(1).default('admin'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: an app that cannot read its own config must not boot.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
