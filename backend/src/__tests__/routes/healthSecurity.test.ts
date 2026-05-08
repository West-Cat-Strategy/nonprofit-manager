import express from 'express';
import request from 'supertest';
import healthRoutes from '@routes/health';

describe('health detailed production protection', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalHealthCheckKey = process.env.HEALTH_CHECK_KEY;

  const app = express();
  app.use('/health', healthRoutes);

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.HEALTH_CHECK_KEY;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalHealthCheckKey === undefined) {
      delete process.env.HEALTH_CHECK_KEY;
    } else {
      process.env.HEALTH_CHECK_KEY = originalHealthCheckKey;
    }
  });

  it('fails closed when the production health key is missing', async () => {
    await request(app).get('/health/detailed').expect(403);
  });

  it('rejects incorrect detailed health keys without exposing diagnostics', async () => {
    process.env.HEALTH_CHECK_KEY = 'production-health-check-key-32-chars';

    await request(app)
      .get('/health/detailed')
      .set('x-health-check-key', 'wrong-production-health-check-key')
      .expect(403);
  });
});
