import pino from 'pino';
import pinoHttp from 'pino-http';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export const httpLogger = () =>
  pinoHttp({
    logger,
    customLogLevel: (_req, res) => (res.statusCode >= 500 ? 'error' : 'info'),
    customProps: (req) => ({
      requestId: req.id,
      route: req.url,
    }),
  });
