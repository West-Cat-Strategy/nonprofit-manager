import express, { Application } from 'express';
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
import healthRoutes, { setHealthCheckPool } from './routes/health';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import contactRoutes from './routes/contacts';
import volunteerRoutes from './routes/volunteers';
import eventRoutes from './routes/events';
import donationRoutes from './routes/donations';
import taskRoutes from './routes/tasks';
import analyticsRoutes from './routes/analytics';
import reportRoutes from './routes/reports';
import savedReportRoutes from './routes/savedReports';
import paymentRoutes from './routes/payments';
import reconciliationRoutes from './routes/reconciliation';
import caseRoutes from './routes/cases';
import mailchimpRoutes from './routes/mailchimp';
import webhookRoutes from './routes/webhooks';
import templateRoutes from './routes/templates';
import publishingRoutes from './routes/publishing';
import dashboardRoutes from './routes/dashboard';
import alertRoutes from './routes/alerts';
import exportRoutes from './routes/export';
import activityRoutes from './routes/activities';
import userRoutes from './routes/users';
import invitationRoutes from './routes/invitations';
import portalAuthRoutes from './routes/portalAuth';
import portalRoutes from './routes/portal';
import portalAdminRoutes from './routes/portalAdmin';
import meetingRoutes from './routes/meetings';
import ingestRoutes from './routes/ingest';
import adminRoutes from './routes/admin';
import backupRoutes from './routes/backup';
import plausibleRoutes from './routes/plausibleProxy';
import { setPaymentPool } from './controllers/paymentController';
import { Pool } from 'pg';

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

  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.includes('dev') || jwtSecret.length < 32) {
    warnings.push('JWT_SECRET appears insecure (contains "dev" or is less than 32 characters)');
  }

  if (process.env.DB_PASSWORD === 'postgres') {
    warnings.push('DB_PASSWORD is set to default value "postgres"');
  }

  const csrfSecret = process.env.CSRF_SECRET || '';
  if (csrfSecret.includes('change') || csrfSecret.length < 32) {
    warnings.push('CSRF_SECRET appears insecure (contains "change" or is less than 32 characters)');
  }

  if (warnings.length > 0) {
    warnings.forEach((w) => logger.warn(`SECURITY WARNING: ${w}`));
    if (process.env.ENFORCE_SECURE_CONFIG === 'true') {
      logger.error('Exiting due to insecure configuration. Set ENFORCE_SECURE_CONFIG=false to disable.');
      process.exit(1);
    }
  }
}

const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword && process.env.NODE_ENV === 'production') {
  logger.error('DB_PASSWORD environment variable is not set');
  throw new Error('DB_PASSWORD must be configured in production');
}

// Database pool for health checks
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nonprofit_manager',
  user: process.env.DB_USER || 'postgres',
  password: dbPassword || 'postgres',
});

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
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
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
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/saved-reports', savedReportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/mailchimp', mailchimpRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/sites', publishingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/portal/auth', portalAuthRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/portal/admin', portalAdminRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/plausible', plausibleRoutes);

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
