import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { logger } from './config/logger';
import { initializeRedis, closeRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiterMiddleware } from './middleware/rateLimiter';
import { csrfMiddleware } from './middleware/csrf';
import { correlationIdMiddleware, CORRELATION_ID_HEADER } from './middleware/correlationId';
import { metricsMiddleware, metricsRouter } from './middleware/metrics';
import { orgContextMiddleware } from './middleware/orgContext';
import healthRoutes, { setHealthCheckPool } from '@routes/health';
import { registerApiRoutes } from '@routes/registrars';
import { setPaymentPool } from '@controllers/domains';
import pool from './config/database';

if (process.env.JEST_WORKER_ID && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Load env files without overriding explicit runtime env vars.
// In test mode, prefer values from .env.test and use .env as fallback.
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
  dotenv.config({ path: '.env' });
} else {
  dotenv.config({ path: '.env' });
}

// Production secrets validation
if (process.env.NODE_ENV === 'production') {
  const warnings: string[] = [];
  const errors: string[] = [];

  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.includes('dev') || jwtSecret.includes('placeholder') || jwtSecret.length < 32) {
    warnings.push('JWT_SECRET appears insecure (contains "dev"/"placeholder" or is less than 32 characters)');
  }

  if (process.env.DB_PASSWORD === 'postgres') {
    errors.push('DB_PASSWORD is set to default value "postgres"');
  }

  const csrfSecret = process.env.CSRF_SECRET || '';
  if (csrfSecret.includes('change') || csrfSecret.includes('placeholder') || csrfSecret.length < 32) {
    warnings.push('CSRF_SECRET appears insecure (contains "change"/"placeholder" or is less than 32 characters)');
  }

  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (stripeWebhookSecret.includes('placeholder') || stripeWebhookSecret.includes('test')) {
    errors.push('STRIPE_WEBHOOK_SECRET must be set to actual Stripe webhook secret (not placeholder or test value)');
  }

  const encryptionKey = process.env.ENCRYPTION_KEY || '';
  if (encryptionKey.length < 64) {
    warnings.push('ENCRYPTION_KEY should be 64 hex characters (256-bit). Current length: ' + encryptionKey.length);
  }

  // Report all warnings and errors
  if (warnings.length > 0) {
    warnings.forEach((w) => logger.warn(`SECURITY WARNING: ${w}`));
  }

  if (errors.length > 0) {
    errors.forEach((e) => logger.error(`SECURITY ERROR: ${e}`));
    if (process.env.ENFORCE_SECURE_CONFIG === 'true') {
      logger.error('Exiting due to insecure configuration. Set ENFORCE_SECURE_CONFIG=false to disable.');
      process.exit(1);
    }
  }
}

// Set pool for health checks and payments
setHealthCheckPool(pool);
setPaymentPool(pool);

const app: Application = express();
const PORT = Number(process.env.PORT) || 3000;

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Default to self for anything not explicitly allowed
        defaultSrc: ["'self'"],
        // Scripts: only from self + nonce for inline if needed
        scriptSrc: ["'self'"],
        // Styles: from self (avoid unsafe-inline; use CSS files instead)
        styleSrc: ["'self'"],
        // Images: self, data URIs (for small inlined images), and https:// 
        imgSrc: ["'self'", 'data:', 'https:'],
        // Fonts: self and Google Fonts if used
        fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        // Connect: self + configured API backend
        connectSrc: ["'self'", `${process.env.API_ORIGIN || 'http://localhost:3000'}`],
        // Frame options: prevent clickjacking
        frameSrc: ["'none'"],
        // Object/embed: restrict plugins
        objectSrc: ["'none'"],
        // Base URI: prevent injection attacks
        baseUri: ["'self'"],
        // Form submissions: only to same origin
        formAction: ["'self'"],
        // Upgrade insecure requests to HTTPS in production
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
      },
      // Report CSP violations for monitoring (optional, for production)
      reportUri: process.env.CSP_REPORT_URI ? [process.env.CSP_REPORT_URI] : undefined,
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
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// In production, require at least one allowed origin to be configured
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  logger.error('CORS_ORIGIN must be configured in production');
  process.exit(1);
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, or same-site requests)
    if (!origin) return callback(null, true);

    // Only allow configured origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  // Only allow credentials from same-origin or explicitly listed origins
  credentials: true,
  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  // Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  // Expose headers to client
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  // Cache preflight for 24 hours (in seconds)
  maxAge: 86400,
  // Treat Origin header strictly
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Stripe webhook needs raw body - must be before json parsing
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

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

// Organization/tenant context middleware (optional)
app.use('/api', orgContextMiddleware);

// Logging middleware with correlation ID
app.use(
  morgan(
    `:method :url :status :res[content-length] - :response-time ms - :req[${CORRELATION_ID_HEADER}]`,
    { stream: { write: (message: string) => logger.info(message.trim()) } }
  )
);

// Rate limiting for all API routes
app.use('/api', apiLimiterMiddleware);

// Health check routes
app.use('/health', healthRoutes);

// Metrics endpoint
app.use('/metrics', metricsRouter);

// API Routes
registerApiRoutes(app);

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
  });
}

export default app;
