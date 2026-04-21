import express, { type Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from './config/logger';
import { initializeRedis, closeRedis } from './config/redis';
import { initializeSentry, sentryErrorHandler } from './config/sentry';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiterMiddleware } from './middleware/rateLimiter';
import { successEnvelopeMiddleware } from './middleware/successEnvelope';
import { csrfMiddleware } from './middleware/csrf';
import { correlationIdMiddleware, CORRELATION_ID_HEADER } from './middleware/correlationId';
import { metricsMiddleware, metricsRouter } from './middleware/metrics';
import { legacyApiTombstoneMiddleware } from './middleware/legacyApiTombstone';
import { validateBody, validateParams } from './middleware/zodValidation';
import { createCorsOptionsDelegate, resolveTrustProxy } from './config/requestSecurity';
import { validateProductionSecurityConfig } from './config/productionSecurityConfig';
import healthRoutes, { setHealthCheckPool } from '@routes/health';
import pool from './config/database';
import { publicEventsV2Routes } from '@modules/events';
import { publicPublishingV2Routes, publicWebsiteFormsV2Routes } from '@modules/publishing';
import { renderPublishedWebsite } from '@modules/publishing/controllers';
import { recordAnalytics } from '@modules/publishing/controllers/publishingController';

if (process.env.JEST_WORKER_ID && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test.local', quiet: true });
  dotenv.config({ path: '.env.test', quiet: true });
  dotenv.config({ path: '.env', quiet: true });
} else {
  dotenv.config({ path: '.env', quiet: true });
}

if (process.env.NODE_ENV === 'production') {
  const { warnings, errors, fatalErrors } = validateProductionSecurityConfig(process.env);
  warnings.forEach((warning) => logger.warn(`SECURITY WARNING: ${warning}`));
  errors.forEach((error) => logger.error(`SECURITY ERROR: ${error}`));
  fatalErrors.forEach((error) => logger.error(`SECURITY ERROR: ${error}`));
  if (fatalErrors.length > 0) {
    logger.error('Exiting due to invalid production database at-rest encryption configuration.');
    process.exit(1);
  }
  if (errors.length > 0 && process.env.ENFORCE_SECURE_CONFIG === 'true') {
    logger.error('Exiting due to insecure configuration. Set ENFORCE_SECURE_CONFIG=false to disable.');
    process.exit(1);
  }
}

setHealthCheckPool(pool);
initializeSentry();

const app: Application = express();
const PORT = Number(process.env.PORT) || 8006;

const resolveConnectSrc = (developmentFallback: string): string[] => {
  const apiOrigin = process.env.API_ORIGIN?.trim();

  if (apiOrigin) {
    return ["'self'", apiOrigin];
  }

  return process.env.NODE_ENV === 'production'
    ? ["'self'"]
    : ["'self'", developmentFallback];
};

app.set('trust proxy', resolveTrustProxy(process.env.TRUST_PROXY));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        connectSrc: resolveConnectSrc('http://localhost:8000'),
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
      },
      ...(process.env.CSP_REPORT_URI ? { reportUri: [process.env.CSP_REPORT_URI] } : {}),
      reportOnly: process.env.NODE_ENV === 'development',
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'no-referrer' },
  })
);

app.use(
  compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
      if (req.headers['accept'] === 'text/event-stream') return false;
      return compression.filter(req, res);
    },
  })
);

const corsOptions = createCorsOptionsDelegate({
  nodeEnv: process.env.NODE_ENV,
  corsOrigin: process.env.CORS_ORIGIN,
  fallbackOrigins: ['http://localhost:8006', 'http://127.0.0.1:8006'],
  allowRequestHostOrigin: true,
  onDeniedOrigin: (origin) => {
    logger.warn(`CORS request from unauthorized origin: ${origin}`);
  },
});
app.use(cors(corsOptions));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(csrfMiddleware);
app.use(correlationIdMiddleware);
app.use(metricsMiddleware);

if (process.env.REQUEST_LOGGING_ENABLED !== 'false') {
  app.use(
    morgan(`:method :url :status :res[content-length] - :response-time ms - :req[${CORRELATION_ID_HEADER}]`, {
      stream: { write: (message: string) => logger.info(message.trim()) },
    })
  );
}

app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/v2/health', healthRoutes);
app.use('/metrics', metricsRouter);
app.use('/api', apiLimiterMiddleware);
app.use('/api', successEnvelopeMiddleware);
app.use('/api', legacyApiTombstoneMiddleware);

const siteIdParamsSchema = z.object({
  siteId: z.string().uuid(),
});

const analyticsTrackSchema = z.object({
  eventType: z.enum(['pageview', 'click', 'form_submit', 'donation', 'event_register']),
  pagePath: z.string().min(1, 'Page path is required'),
  visitorId: z.string().optional(),
  sessionId: z.string().optional(),
  country: z.string().max(2).optional(),
  city: z.string().max(100).optional(),
  deviceType: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  eventData: z.record(z.string(), z.unknown()).optional(),
});

app.use('/api/v2/public/events', publicEventsV2Routes);
app.use('/api/v2/public/newsletters', publicPublishingV2Routes);
app.use('/api/v2/public/forms', publicWebsiteFormsV2Routes);
app.post(
  '/api/v2/sites/:siteId/track',
  validateParams(siteIdParamsSchema),
  validateBody(analyticsTrackSchema),
  recordAnalytics
);

app.get(/.*/, (req, res, next) => {
  if (req.path === '/health' || req.path === '/metrics' || req.path.startsWith('/api/')) {
    next();
    return;
  }

  void renderPublishedWebsite(req, res, next);
});

sentryErrorHandler(app);
app.use(errorHandler);

initializeRedis().catch((err) => {
  logger.error('Failed to initialize Redis, continuing without cache:', err);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing public site server gracefully...');
  await Promise.all([closeRedis(), pool.end()]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing public site server gracefully...');
  await Promise.all([closeRedis(), pool.end()]);
  process.exit(0);
});

const shouldStartServer = !process.env.JEST_WORKER_ID && process.env.START_SERVER !== 'false';
if (shouldStartServer) {
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    logger.info(`Nonprofit Manager public site runtime running on ${HOST}:${PORT}`);
  });
}

export default app;
