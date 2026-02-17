"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./config/logger");
const redis_1 = require("./config/redis");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const correlationId_1 = require("./middleware/correlationId");
const metrics_1 = require("./middleware/metrics");
const orgContext_1 = require("./middleware/orgContext");
const health_1 = __importStar(require("./routes/health"));
const auth_1 = __importDefault(require("./routes/auth"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const contacts_1 = __importDefault(require("./routes/contacts"));
const volunteers_1 = __importDefault(require("./routes/volunteers"));
const events_1 = __importDefault(require("./routes/events"));
const donations_1 = __importDefault(require("./routes/donations"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const reports_1 = __importDefault(require("./routes/reports"));
const savedReports_1 = __importDefault(require("./routes/savedReports"));
const payments_1 = __importDefault(require("./routes/payments"));
const reconciliation_1 = __importDefault(require("./routes/reconciliation"));
const cases_1 = __importDefault(require("./routes/cases"));
const mailchimp_1 = __importDefault(require("./routes/mailchimp"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const templates_1 = __importDefault(require("./routes/templates"));
const publishing_1 = __importDefault(require("./routes/publishing"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const export_1 = __importDefault(require("./routes/export"));
const activities_1 = __importDefault(require("./routes/activities"));
const users_1 = __importDefault(require("./routes/users"));
const invitations_1 = __importDefault(require("./routes/invitations"));
const portalAuth_1 = __importDefault(require("./routes/portalAuth"));
const portal_1 = __importDefault(require("./routes/portal"));
const portalAdmin_1 = __importDefault(require("./routes/portalAdmin"));
const meetings_1 = __importDefault(require("./routes/meetings"));
const ingest_1 = __importDefault(require("./routes/ingest"));
const admin_1 = __importDefault(require("./routes/admin"));
const backup_1 = __importDefault(require("./routes/backup"));
const paymentController_1 = require("./controllers/paymentController");
const pg_1 = require("pg");
dotenv_1.default.config();
const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword && process.env.NODE_ENV === 'production') {
    logger_1.logger.error('DB_PASSWORD environment variable is not set');
    throw new Error('DB_PASSWORD must be configured in production');
}
// Database pool for health checks
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'nonprofit_manager',
    user: process.env.DB_USER || 'postgres',
    password: dbPassword || 'postgres',
});
// Set pool for health checks and payments
(0, health_1.setHealthCheckPool)(pool);
(0, paymentController_1.setPaymentPool)(pool);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Security Middleware
app.use((0, helmet_1.default)({
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
}));
// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
// Stripe webhook needs raw body - must be before json parsing
app.use('/api/payments/webhook', express_1.default.raw({ type: 'application/json' }));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Correlation ID middleware (early - before logging)
app.use(correlationId_1.correlationIdMiddleware);
// Metrics middleware (before routes)
app.use(metrics_1.metricsMiddleware);
// Organization/tenant context middleware (optional)
app.use('/api', orgContext_1.orgContextMiddleware);
// Logging middleware with correlation ID
app.use((0, morgan_1.default)(`:method :url :status :res[content-length] - :response-time ms - :req[${correlationId_1.CORRELATION_ID_HEADER}]`, { stream: { write: (message) => logger_1.logger.info(message.trim()) } }));
// Rate limiting for all API routes
app.use('/api', rateLimiter_1.apiLimiter);
// Health check routes
app.use('/health', health_1.default);
// Metrics endpoint
app.use('/metrics', metrics_1.metricsRouter);
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/accounts', accounts_1.default);
app.use('/api/contacts', contacts_1.default);
app.use('/api/volunteers', volunteers_1.default);
app.use('/api/events', events_1.default);
app.use('/api/donations', donations_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/saved-reports', savedReports_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/reconciliation', reconciliation_1.default);
app.use('/api/cases', cases_1.default);
app.use('/api/mailchimp', mailchimp_1.default);
app.use('/api/webhooks', webhooks_1.default);
app.use('/api/templates', templates_1.default);
app.use('/api/sites', publishing_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/alerts', alerts_1.default);
app.use('/api/export', export_1.default);
app.use('/api/activities', activities_1.default);
app.use('/api/users', users_1.default);
app.use('/api/invitations', invitations_1.default);
app.use('/api/portal/auth', portalAuth_1.default);
app.use('/api/portal', portal_1.default);
app.use('/api/portal/admin', portalAdmin_1.default);
app.use('/api/meetings', meetings_1.default);
app.use('/api/ingest', ingest_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/backup', backup_1.default);
// Error handling
app.use(errorHandler_1.errorHandler);
// Initialize Redis (async - don't block startup)
(0, redis_1.initializeRedis)().catch((err) => {
    logger_1.logger.error('Failed to initialize Redis, continuing without cache:', err);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, closing server gracefully...');
    await Promise.all([(0, redis_1.closeRedis)(), pool.end()]);
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, closing server gracefully...');
    await Promise.all([(0, redis_1.closeRedis)(), pool.end()]);
    process.exit(0);
});
// Start server (skip in test env)
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        logger_1.logger.info(`Nonprofit Manager API running on port ${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map