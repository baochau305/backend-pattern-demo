import type { Express } from 'express';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from '../config/env.js';
import { basicAuth } from '../middlewares/basic-auth.middleware.js';
import { analyticsQueue, emailQueue } from './queues.js';

/**
 * Mounts the Bull Board queue dashboard (jobs waiting/active/failed, payloads,
 * retry & clean actions) at BULL_BOARD_PATH.
 *
 * It is an operator tool, not part of the public API, so it is guarded by HTTP
 * Basic auth with credentials from env rather than the JWT/RBAC used by routes.
 * The dashboard is read/write (jobs can be retried or removed) — keep the
 * credentials secret and prefer disabling it (BULL_BOARD_ENABLED=false) where an
 * upstream proxy already exposes an admin surface.
 */
export const setupBullBoard = (app: Express): void => {
  if (!env.BULL_BOARD_ENABLED) return;

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(env.BULL_BOARD_PATH);

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue), new BullMQAdapter(analyticsQueue)],
    serverAdapter,
  });

  app.use(
    env.BULL_BOARD_PATH,
    basicAuth({
      username: env.BULL_BOARD_USERNAME,
      password: env.BULL_BOARD_PASSWORD,
      realm: 'Bull Board',
    }),
    // The bundled UI ships inline <style> blocks and a Google Fonts stylesheet,
    // which helmet's default CSP ('self' only) would block. Relax the policy for
    // this mount only — it overwrites the global header for these responses.
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    }),
    serverAdapter.getRouter(),
  );
};
