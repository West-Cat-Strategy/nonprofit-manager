import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
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
import healthRoutes, { setHealthCheckPool } from '@routes/health';
import { registerV2Routes } from '@routes/v2';
import { setPaymentPool } from '@modules/payments';
import { renderPublishedWebsite } from '@modules/publishing/controllers';
import pool from './config/database';
import { createCorsOptionsDelegate, resolveTrustProxy } from './config/requestSecurity';
import { validateProductionSecurityConfig } from './config/productionSecurityConfig';

if (process.env.JEST_WORKER_ID && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Load env files without overriding explicit runtime env vars.
// In test mode, prefer .env.test.local, then .env.test, and use .env as fallback.
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test.local', quiet: true });
  dotenv.config({ path: '.env.test', quiet: true });
  dotenv.config({ path: '.env', quiet: true });
} else {
  dotenv.config({ path: '.env', quiet: true });
}

// Production secrets validation
if (process.env.NODE_ENV === 'production') {
  const { warnings, errors, fatalErrors } = validateProductionSecurityConfig(process.env);

  // Report all warnings and errors
  if (warnings.length > 0) {
    warnings.forEach((w) => logger.warn(`SECURITY WARNING: ${w}`));
  }

  if (errors.length > 0) {
    errors.forEach((e) => logger.error(`SECURITY ERROR: ${e}`));
  }

  if (fatalErrors.length > 0) {
    fatalErrors.forEach((e) => logger.error(`SECURITY ERROR: ${e}`));
    logger.error('Exiting due to invalid production database at-rest encryption configuration.');
    process.exit(1);
  }

  if (errors.length > 0) {
    if (process.env.ENFORCE_SECURE_CONFIG === 'true') {
      logger.error('Exiting due to insecure configuration. Set ENFORCE_SECURE_CONFIG=false to disable.');
      process.exit(1);
    }
  }
}

// Set pool for health checks and payments
setHealthCheckPool(pool);
setPaymentPool(pool);

// Initialize Sentry
initializeSentry();

const app: Application = express();

const PORT = Number(process.env.PORT) || 3000;
const requestLoggingEnabled =
  process.env.REQUEST_LOGGING_ENABLED === 'true' ||
  (process.env.REQUEST_LOGGING_ENABLED !== 'false' && process.env.NODE_ENV === 'production');

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

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Default to self for anything not explicitly allowed
        defaultSrc: ["'self'"],
        // Generated public-site pages ship small inline runtime scripts/styles.
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        // Images: self, data URIs (for small inlined images), and https:// 
        imgSrc: ["'self'", 'data:', 'https:'],
        // Fonts: self and Google Fonts if used
        fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        // Connect: self + configured API backend
        connectSrc: resolveConnectSrc('http://localhost:3000'),
        // Frame options: prevent clickjacking
        frameSrc: ["'none'"],
        // Object/embed: restrict plugins
        objectSrc: ["'none'"],
        // Base URI: prevent injection attacks
        baseUri: ["'self'"],
        // Form submissions: only to same origin
        formAction: ["'self'"],
        // Upgrade insecure requests to HTTPS in production
        ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
      },
      // Report CSP violations for monitoring (optional, for production)
      ...(process.env.CSP_REPORT_URI ? { reportUri: [process.env.CSP_REPORT_URI] } : {}),
      // Report-Only mode in development for testing without blocking
      reportOnly: process.env.NODE_ENV === 'development',
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Prevent browsers from MIME-sniffing
    noSniff: true,
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Prevent XSS attacks
    xssFilter: true,
    // Referrer policy
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// Response compression — gzip/brotli for all text-based responses (JSON, HTML, etc.)
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6,        // Balanced compression level (1=fast, 9=max)
  filter: (req, res) => {
    // Don't compress SSE or streaming responses
    if (req.headers['accept'] === 'text/event-stream') return false;
    return compression.filter(req, res);
  },
}));

// CORS configuration
const corsOptions = createCorsOptionsDelegate({
  nodeEnv: process.env.NODE_ENV,
  corsOrigin: process.env.CORS_ORIGIN,
  fallbackOrigins: ['http://localhost:5173'],
  onDeniedOrigin: (origin) => {
    logger.warn(`CORS request from unauthorized origin: ${origin}`);
  },
});
app.use(cors(corsOptions));

// Stripe webhook needs raw body - must be before json parsing
app.use('/api/v2/payments/webhook', express.raw({ type: 'application/json' }));

// Cookie parser middleware (before body parsing for CSRF)
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CSRF protection middleware (after cookie-parser and body parsing)
app.use(csrfMiddleware);

// Correlation ID middleware (early - before logging)
app.use(correlationIdMiddleware);

// Metrics middleware (before routes)
app.use(metricsMiddleware);

// Mount health routes before any /api middleware so compatibility aliases
// bypass org-context, envelopes, and legacy tombstoning.
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/v2/health', healthRoutes);

// Logging middleware with correlation ID
if (requestLoggingEnabled) {
  app.use(
    morgan(
      `:method :url :status :res[content-length] - :response-time ms - :req[${CORRELATION_ID_HEADER}]`,
      { stream: { write: (message: string) => logger.info(message.trim()) } }
    )
  );
}

// Rate limiting for all API routes
app.use('/api', apiLimiterMiddleware);
app.use('/api', successEnvelopeMiddleware);
app.use('/api', legacyApiTombstoneMiddleware);

// Metrics endpoint
app.use('/metrics', metricsRouter);

// API Routes
registerV2Routes(app);

// Serve published websites by host/path after API routes are mounted.
app.get(/.*/, (req, res, next) => {
  if (
    req.path === '/health' ||
    req.path === '/metrics' ||
    req.path === '/favicon.ico' ||
    req.path.startsWith('/api/')
  ) {
    next();
    return;
  }

  void renderPublishedWebsite(req, res, next);
});

// Sentry error handler (must be after all controllers, before other error handlers)
sentryErrorHandler(app);

// Error handling
app.use(errorHandler);

// Initialize Redis (async - don't block startup)
initializeRedis().catch((err) => {
  logger.error('Failed to initialize Redis, continuing without cache:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server gracefully...');
  await Promise.all([closeRedis(), pool.end()]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server gracefully...');
  await Promise.all([closeRedis(), pool.end()]);
  process.exit(0);
});

// Start server (skip for jest worker or explicit opt-out)
const shouldStartServer =
  !process.env.JEST_WORKER_ID && process.env.START_SERVER !== 'false';
if (shouldStartServer) {
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    logger.info(`Nonprofit Manager API running on ${HOST}:${PORT}`);
    logger.info('Background worker processes are managed separately.');
  });
}

export default app;
