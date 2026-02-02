import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { logger } from './config/logger';
import { initializeRedis, closeRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { correlationIdMiddleware, CORRELATION_ID_HEADER } from './middleware/correlationId';
import { metricsMiddleware, metricsRouter } from './middleware/metrics';
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
import { setPaymentPool } from './controllers/paymentController';
import { Pool } from 'pg';

dotenv.config();

// Database pool for health checks
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nonprofit_manager',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Set pool for health checks and payments
setHealthCheckPool(pool);
setPaymentPool(pool);

const app: Application = express();
const PORT = process.env.PORT || 3000;

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
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Correlation ID middleware (early - before logging)
app.use(correlationIdMiddleware);

// Metrics middleware (before routes)
app.use(metricsMiddleware);

// Logging middleware with correlation ID
app.use(
  morgan(
    `:method :url :status :res[content-length] - :response-time ms - :req[${CORRELATION_ID_HEADER}]`,
    { stream: { write: (message: string) => logger.info(message.trim()) } }
  )
);

// Rate limiting for all API routes
app.use('/api', apiLimiter);

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

// Start server (skip in test env)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Nonprofit Manager API running on port ${PORT}`);
  });
}

export default app;
