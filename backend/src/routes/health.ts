/**
 * Health Check Routes
 * Provides liveness and readiness endpoints for container orchestration
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { getRedisClient } from '@config/redis';
import { logger } from '@config/logger';
import { errorPayload, forbidden } from '@utils/responseHelpers';

const router = Router();

// Database pool for health checks
let pool: Pool | null = null;

export const setHealthCheckPool = (dbPool: Pool): void => {
  pool = dbPool;
};

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ComponentHealth> {
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
  } catch (error) {
    logger.error('Database health check failed', { error });
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
async function checkRedis(): Promise<ComponentHealth> {
  const redis = getRedisClient();
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
  } catch (error) {
    logger.error('Redis health check failed', { error });
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
router.get('/', (_req: Request, res: Response) => {
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
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * GET /health/ready
 * Readiness probe - indicates if the application can handle traffic
 * Checks all dependencies (database, cache, etc.)
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    const overallStatus: 'healthy' | 'unhealthy' | 'degraded' =
      dbHealth.status === 'down'
        ? 'unhealthy'
        : redisHealth.status === 'down'
          ? 'degraded'
          : 'healthy';

    const healthStatus: HealthStatus = {
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
  } catch (error) {
    logger.error('Health check error', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      ...errorPayload(res, 'Health check failed', undefined, 'service_unavailable'),
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health information (protected in production)
 */
router.get('/detailed', async (req: Request, res: Response) => {
  // In production, require auth header or internal network
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers['x-health-check-key'];
    if (authHeader !== process.env.HEALTH_CHECK_KEY) {
      forbidden(res, 'Forbidden');
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

export default router;
