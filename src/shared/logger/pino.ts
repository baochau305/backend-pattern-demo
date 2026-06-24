import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import pino from 'pino';
import pinoHttp, { type HttpLogger, type Options } from 'pino-http';
import { isProduction, isTest } from '../config/env.js';

/**
 * Structured, environment-aware logging.
 *
 * - In production we emit raw JSON (one object per line) so log shippers can parse it.
 * - In development we pretty-print for readability (pino-pretty if installed).
 * - `redact` strips secrets (passwords, tokens, auth headers) from every log line.
 */
export const logger = pino({
  level: isTest ? 'silent' : isProduction ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.accessToken',
    ],
    remove: true,
  },
  // Pretty transport only for local dev — never in production (raw JSON) or tests
  // (avoids spawning a worker-thread transport that can leak open handles in Jest).
  ...(isProduction || isTest
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }),
});

const pinoHttpFactory =
  (pinoHttp as unknown as { default?: (opts?: Options) => HttpLogger })
    .default ?? (pinoHttp as unknown as (opts?: Options) => HttpLogger);

/**
 * HTTP request/response logger. Attaches a `requestId` to every request and
 * enriches each completed-request log line with the fields the spec requires:
 * requestId, userId, route (method + url), statusCode and responseTime (ms).
 */
export const httpLogger = (): HttpLogger =>
  pinoHttpFactory({
    logger,
    // Reuse an inbound X-Request-Id when present (distributed tracing), else generate one.
    genReqId: (req, res) => {
      const incoming = req.headers['x-request-id'];
      const id =
        (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customProps: (req: IncomingMessage, res: ServerResponse) => {
      // `id` is added by pino-http; `user` by our auth guard. Read them defensively.
      const r = req as IncomingMessage & {
        id?: unknown;
        user?: { id: string };
      };
      return {
        requestId: r.id !== undefined ? String(r.id) : undefined,
        userId: r.user?.id,
        route: `${req.method ?? ''} ${req.url ?? ''}`.trim(),
        statusCode: res.statusCode,
      };
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} -> ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,
  });
