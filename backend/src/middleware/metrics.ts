/**
 * Prometheus Metrics Middleware
 * Collects and exposes application metrics for monitoring
 *
 * NOTE: For high-traffic production systems, use the `prom-client` npm package
 * instead of this in-memory implementation. This is designed for small to medium
 * deployments and includes automatic cleanup to prevent memory leaks.
 */

import { Request, Response, NextFunction, Router } from 'express';
import { logger } from '../config/logger';
import { forbidden } from '@utils/responseHelpers';

// Simple in-memory metrics store (for production, use prom-client)
interface Metrics {
  httpRequestsTotal: Map<string, number>;
  httpRequestDuration: Map<string, number[]>;
  httpRequestsInProgress: number;
  errorCount: number;
  startTime: number;
}

const metrics: Metrics = {
  httpRequestsTotal: new Map(),
  httpRequestDuration: new Map(),
  httpRequestsInProgress: 0,
  errorCount: 0,
  startTime: Date.now(),
};

// Periodic cleanup of stale metric entries to prevent unbounded memory growth
// Removes endpoints that haven't been accessed in MAX_AGE_MS
const METRICS_CLEANUP_INTERVAL_MS = 3600000; // 1 hour
const MAX_ENDPOINT_AGE_MS = 7200000; // 2 hours max idle before removal
const lastAccessTimes = new Map<string, number>();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let deletedCount = 0;

  for (const [key] of metrics.httpRequestsTotal) {
    const lastAccess = lastAccessTimes.get(key) || 0;
    if (now - lastAccess > MAX_ENDPOINT_AGE_MS) {
      metrics.httpRequestsTotal.delete(key);
      metrics.httpRequestDuration.delete(key);
      lastAccessTimes.delete(key);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    logger.debug(`Metrics cleanup: removed ${deletedCount} stale endpoint entries`);
  }
}, METRICS_CLEANUP_INTERVAL_MS);

// Allow process to exit even with this interval running
cleanupInterval.unref();

/**
 * Get metric key for request
 */
function getMetricKey(method: string, path: string, status: number): string {
  // Normalize path to avoid high cardinality (remove UUIDs, IDs)
  const normalizedPath = path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id')
    .split('?')[0]; // Remove query params

  return `${method}|${normalizedPath}|${status}`;
}

/**
 * Middleware to collect request metrics
 */
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  metrics.httpRequestsInProgress++;

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const key = getMetricKey(req.method, req.path, res.statusCode);

    // Track last access time for cleanup
    lastAccessTimes.set(key, Date.now());

    // Increment request count
    const currentCount = metrics.httpRequestsTotal.get(key) || 0;
    metrics.httpRequestsTotal.set(key, currentCount + 1);

    // Record duration
    const durations = metrics.httpRequestDuration.get(key) || [];
    durations.push(duration);
    // Keep only last 1000 samples per endpoint
    if (durations.length > 1000) {
      durations.shift();
    }
    metrics.httpRequestDuration.set(key, durations);

    metrics.httpRequestsInProgress--;

    // Track errors
    if (res.statusCode >= 400) {
      metrics.errorCount++;
    }
  });

  next();
};

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Format metrics in Prometheus exposition format
 */
function formatPrometheusMetrics(): string {
  const lines: string[] = [];
  const uptime = (Date.now() - metrics.startTime) / 1000;

  // Application info
  lines.push('# HELP app_info Application information');
  lines.push('# TYPE app_info gauge');
  lines.push(`app_info{version="${process.env.npm_package_version || '1.0.0'}",env="${process.env.NODE_ENV || 'development'}"} 1`);

  // Uptime
  lines.push('# HELP app_uptime_seconds Application uptime in seconds');
  lines.push('# TYPE app_uptime_seconds counter');
  lines.push(`app_uptime_seconds ${uptime.toFixed(2)}`);

  // HTTP requests total
  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, count] of metrics.httpRequestsTotal) {
    const [method, path, status] = key.split('|');
    lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`);
  }

  // HTTP requests in progress
  lines.push('# HELP http_requests_in_progress Number of HTTP requests currently being processed');
  lines.push('# TYPE http_requests_in_progress gauge');
  lines.push(`http_requests_in_progress ${metrics.httpRequestsInProgress}`);

  // HTTP request duration
  lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
  lines.push('# TYPE http_request_duration_ms summary');
  for (const [key, durations] of metrics.httpRequestDuration) {
    const [method, path] = key.split('|');
    if (durations.length > 0) {
      const p50 = percentile(durations, 50);
      const p95 = percentile(durations, 95);
      const p99 = percentile(durations, 99);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

      lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.5"} ${p50}`);
      lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.95"} ${p95}`);
      lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.99"} ${p99}`);
      lines.push(`http_request_duration_ms_avg{method="${method}",path="${path}"} ${avg.toFixed(2)}`);
    }
  }

  // Error count
  lines.push('# HELP http_errors_total Total number of HTTP errors (4xx and 5xx)');
  lines.push('# TYPE http_errors_total counter');
  lines.push(`http_errors_total ${metrics.errorCount}`);

  // Memory usage
  const memUsage = process.memoryUsage();
  lines.push('# HELP nodejs_memory_heap_used_bytes Process heap memory used');
  lines.push('# TYPE nodejs_memory_heap_used_bytes gauge');
  lines.push(`nodejs_memory_heap_used_bytes ${memUsage.heapUsed}`);

  lines.push('# HELP nodejs_memory_heap_total_bytes Process heap memory total');
  lines.push('# TYPE nodejs_memory_heap_total_bytes gauge');
  lines.push(`nodejs_memory_heap_total_bytes ${memUsage.heapTotal}`);

  lines.push('# HELP nodejs_memory_rss_bytes Process resident set size');
  lines.push('# TYPE nodejs_memory_rss_bytes gauge');
  lines.push(`nodejs_memory_rss_bytes ${memUsage.rss}`);

  return lines.join('\n');
}

/**
 * Metrics router for /metrics endpoint
 */
export const metricsRouter = Router();

metricsRouter.get('/', (req: Request, res: Response) => {
  // In production, optionally protect metrics endpoint
  if (process.env.NODE_ENV === 'production' && process.env.METRICS_AUTH_KEY) {
    const authHeader = req.headers['x-metrics-key'];
    if (authHeader !== process.env.METRICS_AUTH_KEY) {
      forbidden(res, 'Forbidden');
      return;
    }
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(formatPrometheusMetrics());
});

/**
 * JSON metrics endpoint for easier consumption
 */
metricsRouter.get('/json', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' && process.env.METRICS_AUTH_KEY) {
    const authHeader = req.headers['x-metrics-key'];
    if (authHeader !== process.env.METRICS_AUTH_KEY) {
      forbidden(res, 'Forbidden');
      return;
    }
  }

  const memUsage = process.memoryUsage();
  const requestStats: Record<string, { count: number; avgDuration: number }> = {};

  for (const [key, count] of metrics.httpRequestsTotal) {
    const durations = metrics.httpRequestDuration.get(key) || [];
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    requestStats[key] = { count, avgDuration: Math.round(avgDuration) };
  }

  res.json({
    uptime: (Date.now() - metrics.startTime) / 1000,
    httpRequestsInProgress: metrics.httpRequestsInProgress,
    errorCount: metrics.errorCount,
    memory: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
    },
    requests: requestStats,
  });
});

export default metricsMiddleware;