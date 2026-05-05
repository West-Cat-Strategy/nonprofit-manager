import express from 'express';
import request from 'supertest';
import {
  getMetricsRegistryForTest,
  metricsMiddleware,
  metricsRouter,
  resetMetricsForTest,
} from '../../middleware/metrics';

const UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('metrics middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMetricsAuthKey = process.env.METRICS_AUTH_KEY;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.METRICS_AUTH_KEY;
    resetMetricsForTest();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.METRICS_AUTH_KEY = originalMetricsAuthKey;
    resetMetricsForTest();
  });

  it('records additive backend outcome metrics with low-cardinality route families', async () => {
    const app = express();
    app.use(metricsMiddleware);
    app.get('/api/v2/contacts/:id', (_req, res) => {
      res.status(503).json({ ok: false });
    });

    await request(app).get(`/api/v2/contacts/${UUID}?include=notes`).expect(503);

    const metrics = await getMetricsRegistryForTest().metrics();

    expect(metrics).toContain(
      'backend_request_outcomes_total{method="GET",route_family="contacts",status_class="5xx",outcome="server_error"} 1'
    );
    expect(metrics).toContain(
      'backend_request_duration_seconds_count{method="GET",route_family="contacts",status_class="5xx"} 1'
    );
    expect(metrics).toContain('http_errors_total{method="GET",path="/api/v2/contacts/:id",status="503"} 1');
    expect(metrics).not.toContain(UUID);
  });

  it('groups non-api requests separately from health and metrics probes', async () => {
    const app = express();
    app.use(metricsMiddleware);
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });
    app.get('/pages/about', (_req, res) => {
      res.status(302).end();
    });

    await request(app).get('/health').expect(200);
    await request(app).get('/pages/about').expect(302);

    const metrics = await getMetricsRegistryForTest().metrics();

    expect(metrics).toContain(
      'backend_request_outcomes_total{method="GET",route_family="health",status_class="2xx",outcome="success"} 1'
    );
    expect(metrics).toContain(
      'backend_request_outcomes_total{method="GET",route_family="web",status_class="3xx",outcome="redirect"} 1'
    );
  });

  it('protects the metrics router with the production metrics key when configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.METRICS_AUTH_KEY = 'secret-metrics-key';

    const app = express();
    app.use('/metrics', metricsRouter);

    await request(app).get('/metrics').expect(403);

    const response = await request(app)
      .get('/metrics')
      .set('x-metrics-key', 'secret-metrics-key')
      .expect(200);

    expect(response.text).toContain('app_info');
  });
});
