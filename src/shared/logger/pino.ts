import type { IncomingMessage, ServerResponse } from 'http';
import pinoHttp from 'pino-http';
import pino from 'pino';
import type { HttpLogger, Options, ReqId } from 'pino-http';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

type PinoHttpFactory = (opts?: Options) => HttpLogger;

const pinoHttpFactory =
  (pinoHttp as unknown as { default?: PinoHttpFactory }).default ??
  (pinoHttp as unknown as PinoHttpFactory);

export const httpLogger = () =>
  pinoHttpFactory({
    logger,
    customLogLevel: (_req: IncomingMessage, res: ServerResponse) =>
      res.statusCode >= 500 ? 'error' : 'info',
    customProps: (req: IncomingMessage & { id?: ReqId }) => ({
      requestId: req.id === undefined ? undefined : String(req.id),
      route: req.url,
    }),
  });
