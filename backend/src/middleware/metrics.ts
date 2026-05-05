import { NextFunction, Request, Response, Router } from 'express';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { forbidden } from '@utils/responseHelpers';

const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'nodejs_',
});

const appInfo = new Gauge({
  name: 'app_info',
  help: 'Application information',
  labelNames: ['version', 'env'] as const,
  registers: [metricsRegistry],
});

const setAppInfoMetric = (): void => {
  appInfo.set(
    {
      version: process.env.npm_package_version || '1.0.0',
      env: process.env.NODE_ENV || 'development',
    },
    1
  );
};

setAppInfoMetric();

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [metricsRegistry],
});

const httpRequestsInProgress = new Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['method', 'path'] as const,
  registers: [metricsRegistry],
});

const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'path', 'status'] as const,
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [metricsRegistry],
});

const httpErrorsTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (4xx and 5xx)',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [metricsRegistry],
});

const backendRequestOutcomesTotal = new Counter({
  name: 'backend_request_outcomes_total',
  help: 'Backend request outcomes grouped by route family and status class',
  labelNames: ['method', 'route_family', 'status_class', 'outcome'] as const,
  registers: [metricsRegistry],
});

const backendRequestDurationSeconds = new Histogram({
  name: 'backend_request_duration_seconds',
  help: 'Backend request duration in seconds grouped by route family and status class',
  labelNames: ['method', 'route_family', 'status_class'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

const normalizeRoutePath = (path: string): string =>
  path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id')
    .split('?')[0];

const resolveMetricPath = (req: Request): string => {
  const routePath =
    typeof req.route?.path === 'string'
      ? req.route.path
      : Array.isArray(req.route?.path)
        ? req.route.path.join('|')
        : req.path;

  const combinedPath = `${req.baseUrl || ''}${routePath || ''}` || req.path || '/';
  return normalizeRoutePath(combinedPath);
};

const resolveRouteFamily = (path: string): string => {
  if (path === '/health' || path === '/api/health' || path === '/api/v2/health') {
    return 'health';
  }

  if (path === '/metrics' || path.startsWith('/metrics/')) {
    return 'metrics';
  }

  const [, apiPrefix, maybeVersion, maybeModule] = path.split('/');
  if (apiPrefix !== 'api') {
    return 'web';
  }

  if (maybeVersion === 'v2') {
    return maybeModule || 'api_v2';
  }

  return maybeVersion || 'api';
};

const resolveStatusClass = (statusCode: number): string => `${Math.trunc(statusCode / 100)}xx`;

const resolveOutcome = (statusCode: number): string => {
  if (statusCode >= 500) {
    return 'server_error';
  }

  if (statusCode >= 400) {
    return 'client_error';
  }

  if (statusCode >= 300) {
    return 'redirect';
  }

  return 'success';
};

const isMetricsProtected = (): boolean =>
  process.env.NODE_ENV === 'production' && Boolean(process.env.METRICS_AUTH_KEY);

const rejectUnauthorizedMetricsRequest = (req: Request, res: Response): boolean => {
  if (!isMetricsProtected()) {
    return false;
  }

  const authHeader = req.headers['x-metrics-key'];
  if (authHeader === process.env.METRICS_AUTH_KEY) {
    return false;
  }

  forbidden(res, 'Forbidden');
  return true;
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const method = req.method;
  const path = resolveMetricPath(req);
  const routeFamily = resolveRouteFamily(path);

  httpRequestsInProgress.inc({ method, path });
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const status = String(res.statusCode);
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const statusClass = resolveStatusClass(res.statusCode);

    httpRequestsInProgress.dec({ method, path });
    httpRequestsTotal.inc({ method, path, status });
    httpRequestDurationMs.observe({ method, path, status }, durationMs);
    backendRequestOutcomesTotal.inc({
      method,
      route_family: routeFamily,
      status_class: statusClass,
      outcome: resolveOutcome(res.statusCode),
    });
    backendRequestDurationSeconds.observe(
      {
        method,
        route_family: routeFamily,
        status_class: statusClass,
      },
      durationMs / 1000
    );

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc({ method, path, status });
    }
  });

  next();
};

export const metricsRouter = Router();

metricsRouter.get('/', async (req: Request, res: Response) => {
  if (rejectUnauthorizedMetricsRequest(req, res)) {
    return;
  }

  res.setHeader('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

metricsRouter.get('/json', async (req: Request, res: Response) => {
  if (rejectUnauthorizedMetricsRequest(req, res)) {
    return;
  }

  res.json({
    metrics: await metricsRegistry.getMetricsAsJSON(),
  });
});

export const resetMetricsForTest = (): void => {
  metricsRegistry.resetMetrics();
  setAppInfoMetric();
};

export const getMetricsRegistryForTest = (): Registry => metricsRegistry;

export default metricsMiddleware;
