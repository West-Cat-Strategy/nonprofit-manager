"use strict";
/**
 * Health Check Routes
 * Provides liveness and readiness endpoints for container orchestration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setHealthCheckPool = void 0;
const express_1 = require("express");
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const router = (0, express_1.Router)();
// Database pool for health checks
let pool = null;
const setHealthCheckPool = (dbPool) => {
    pool = dbPool;
};
exports.setHealthCheckPool = setHealthCheckPool;
/**
 * Check database connectivity
 */
async function checkDatabase() {
    if (!pool) {
        return { status: 'down', message: 'Database pool not initialized' };
    }
    const start = Date.now();
    try {
        await pool.query('SELECT 1');
        return {
            status: 'up',
            latency: Date.now() - start,
        };
    }
    catch (error) {
        logger_1.logger.error('Database health check failed', { error });
        return {
            status: 'down',
            latency: Date.now() - start,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Check Redis connectivity
 */
async function checkRedis() {
    const redis = (0, redis_1.getRedisClient)();
    if (!redis) {
        return { status: 'down', message: 'Redis not configured' };
    }
    const start = Date.now();
    try {
        await redis.ping();
        return {
            status: 'up',
            latency: Date.now() - start,
        };
    }
    catch (error) {
        logger_1.logger.error('Redis health check failed', { error });
        return {
            status: 'down',
            latency: Date.now() - start,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * GET /health
 * Liveness probe - indicates if the application is running
 * Used by orchestrators to determine if container should be restarted
 */
router.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
/**
 * GET /health/live
 * Kubernetes-style liveness probe
 */
router.get('/live', (_req, res) => {
    res.status(200).json({ status: 'alive' });
});
/**
 * GET /health/ready
 * Readiness probe - indicates if the application can handle traffic
 * Checks all dependencies (database, cache, etc.)
 */
router.get('/ready', async (_req, res) => {
    try {
        const [dbHealth, redisHealth] = await Promise.all([
            checkDatabase(),
            checkRedis(),
        ]);
        const overallStatus = dbHealth.status === 'down'
            ? 'unhealthy'
            : redisHealth.status === 'down'
                ? 'degraded'
                : 'healthy';
        const healthStatus = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            checks: {
                database: dbHealth,
                redis: redisHealth,
            },
        };
        // Return 503 if unhealthy (database down)
        // Return 200 for healthy or degraded (redis down is acceptable)
        const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
        res.status(statusCode).json(healthStatus);
    }
    catch (error) {
        logger_1.logger.error('Health check error', { error });
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
});
/**
 * GET /health/detailed
 * Detailed health information (protected in production)
 */
router.get('/detailed', async (req, res) => {
    // In production, require auth header or internal network
    if (process.env.NODE_ENV === 'production') {
        const authHeader = req.headers['x-health-check-key'];
        if (authHeader !== process.env.HEALTH_CHECK_KEY) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
    }
    const [dbHealth, redisHealth] = await Promise.all([
        checkDatabase(),
        checkRedis(),
    ]);
    res.json({
        status: dbHealth.status === 'up' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        checks: {
            database: dbHealth,
            redis: redisHealth,
        },
    });
});
exports.default = router;
//# sourceMappingURL=health.js.map