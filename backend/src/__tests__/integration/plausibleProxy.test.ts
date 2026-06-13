import request from 'supertest';
import app from '../../index';
import {
  createIntegrationAuthContext,
  deleteIntegrationAuthFixtures,
} from './helpers/authFixtures';

const createFetchResponse = (payload: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(payload),
  text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
});

describe('Plausible proxy API integration', () => {
  let authToken = '';
  let userId = '';
  let organizationId = '';

  const originalEnv = {
    PLAUSIBLE_API_KEY: process.env.PLAUSIBLE_API_KEY,
    PLAUSIBLE_API_HOST: process.env.PLAUSIBLE_API_HOST,
    PLAUSIBLE_DOMAIN: process.env.PLAUSIBLE_DOMAIN,
  };

  beforeAll(async () => {
    const context = await createIntegrationAuthContext({
      role: 'admin',
      emailPrefix: 'plausible-admin',
      accountName: `Plausible Proxy Test Org ${Date.now()}`,
    });
    authToken = context.authToken;
    userId = context.userId;
    organizationId = context.organizationId;
  });

  beforeEach(() => {
    (global as typeof globalThis & { fetch: jest.Mock }).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    if (originalEnv.PLAUSIBLE_API_KEY === undefined) delete process.env.PLAUSIBLE_API_KEY;
    else process.env.PLAUSIBLE_API_KEY = originalEnv.PLAUSIBLE_API_KEY;
    if (originalEnv.PLAUSIBLE_API_HOST === undefined) delete process.env.PLAUSIBLE_API_HOST;
    else process.env.PLAUSIBLE_API_HOST = originalEnv.PLAUSIBLE_API_HOST;
    if (originalEnv.PLAUSIBLE_DOMAIN === undefined) delete process.env.PLAUSIBLE_DOMAIN;
    else process.env.PLAUSIBLE_DOMAIN = originalEnv.PLAUSIBLE_DOMAIN;
  });

  afterAll(async () => {
    await deleteIntegrationAuthFixtures({
      userIds: userId ? [userId] : [],
      organizationIds: organizationId ? [organizationId] : [],
    });
  });

  it('returns a service-unavailable boundary when analytics credentials are missing', async () => {
    delete process.env.PLAUSIBLE_API_KEY;
    delete process.env.PLAUSIBLE_DOMAIN;

    const response = await request(app)
      .get('/api/v2/plausible/stats/aggregate')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(503);

    expect(response.body).toEqual({ error: 'Analytics service not configured' });
    expect((global as typeof globalThis & { fetch: jest.Mock }).fetch).not.toHaveBeenCalled();
  });

  it('proxies aggregate requests with the configured site and bearer token', async () => {
    process.env.PLAUSIBLE_API_KEY = 'plausible-test-key';
    process.env.PLAUSIBLE_API_HOST = 'https://analytics.example.test';
    process.env.PLAUSIBLE_DOMAIN = 'site.example.org';
    (global as typeof globalThis & { fetch: jest.Mock }).fetch.mockResolvedValue(
      createFetchResponse({ results: { visitors: { value: 42 } } })
    );

    const response = await request(app)
      .get('/api/v2/plausible/stats/aggregate?period=7d&metrics=visitors')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { results: { visitors: { value: 42 } } },
    });
    const [url, options] = (global as typeof globalThis & { fetch: jest.Mock }).fetch.mock.calls[0];
    const proxiedUrl = new URL(url);
    expect(proxiedUrl.origin).toBe('https://analytics.example.test');
    expect(proxiedUrl.pathname).toBe('/api/v1/stats/aggregate');
    expect(proxiedUrl.searchParams.get('site_id')).toBe('site.example.org');
    expect(proxiedUrl.searchParams.get('period')).toBe('7d');
    expect(proxiedUrl.searchParams.get('metrics')).toBe('visitors');
    expect(options).toMatchObject({
      headers: {
        Authorization: 'Bearer plausible-test-key',
      },
    });
  });
});
