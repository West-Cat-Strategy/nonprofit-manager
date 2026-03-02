import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../index';
import pool from '@config/database';
import { getJwtSecret } from '@config/jwt';
import { randomUUID } from 'crypto';
import { handleWebhook, setPaymentPool } from '@controllers/paymentController';
import { stripeService } from '@services/domains/operations';

type GuardrailCase = {
  name: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  expectedStatus: number;
  expectedCode: string;
  payload?: Record<string, unknown>;
  withActiveOrgContext?: boolean;
};

const AUTH_REQUIRED_CASES: GuardrailCase[] = [
  {
    name: 'accounts list requires auth',
    method: 'get',
    path: '/api/accounts',
    expectedStatus: 401,
    expectedCode: 'unauthorized',
  },
  {
    name: 'current user requires auth',
    method: 'get',
    path: '/api/auth/me',
    expectedStatus: 401,
    expectedCode: 'unauthorized',
  },
  {
    name: 'webhook endpoint list requires auth',
    method: 'get',
    path: '/api/webhooks/endpoints',
    expectedStatus: 401,
    expectedCode: 'unauthorized',
  },
  {
    name: 'task create requires auth',
    method: 'post',
    path: '/api/tasks',
    expectedStatus: 401,
    expectedCode: 'unauthorized',
    payload: {
      subject: 'Guardrail test task',
    },
  },
];

const VALIDATION_REQUIRED_CASES: GuardrailCase[] = [
  {
    name: 'register validates payload',
    method: 'post',
    path: '/api/auth/register',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    payload: {
      email: 'invalid-email',
      password: 'short',
    },
  },
  {
    name: 'login validates payload',
    method: 'post',
    path: '/api/auth/login',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    payload: {
      email: 'bad-email',
    },
  },
  {
    name: 'setup validates payload',
    method: 'post',
    path: '/api/auth/setup',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    payload: {},
  },
];

const AUTH_VALIDATION_REQUIRED_CASES: GuardrailCase[] = [
  {
    name: 'activities recent enforces query bounds',
    method: 'get',
    path: '/api/activities/recent?limit=500',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    withActiveOrgContext: true,
  },
  {
    name: 'external service provider create enforces body schema',
    method: 'post',
    path: '/api/external-service-providers',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    payload: {},
    withActiveOrgContext: true,
  },
  {
    name: 'reconciliation endpoints enforce UUID params',
    method: 'get',
    path: '/api/reconciliation/not-a-uuid',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    withActiveOrgContext: true,
  },
];

const WEBHOOK_GUARDRAIL_CASES: GuardrailCase[] = [
  {
    name: 'stripe webhook requires signature',
    method: 'post',
    path: '/api/payments/webhook',
    expectedStatus: 400,
    expectedCode: 'bad_request',
    payload: {},
  },
];

const SUCCESS_CONTRACT_CASES: Array<{ name: string; method: 'get' | 'post'; path: string }> = [
  {
    name: 'auth setup-status success envelope',
    method: 'get',
    path: '/api/auth/setup-status',
  },
  {
    name: 'payments config success envelope',
    method: 'get',
    path: '/api/payments/config',
  },
];

const expectCanonicalError = (response: request.Response, code: string): void => {
  expect(response.body).toMatchObject({
    success: false,
    error: {
      code,
      message: expect.any(String),
    },
  });
};

const CORRELATION_ID_POLICY = /^[A-Za-z0-9._:-]{8,128}$/;

describe('Route Guardrails Integration', () => {
  let authToken: string;
  let authTokenNoOrgContext: string;
  const activeOrgId = randomUUID();
  const inactiveOrgId = randomUUID();
  const activeOrgAccountNumber = `GR-ACT-${activeOrgId.slice(0, 8)}`;
  const inactiveOrgAccountNumber = `GR-INACT-${inactiveOrgId.slice(0, 8)}`;

  beforeAll(async () => {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `guardrails-${unique}@example.com`,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Guardrail',
        last_name: 'Tester',
      })
      .expect(201);

    authToken = registerResponse.body.token || registerResponse.body?.data?.token;
    if (!authToken) {
      throw new Error('Failed to extract auth token for guardrail validation tests');
    }

    const registeredUser =
      registerResponse.body.user ||
      registerResponse.body?.data?.user;
    const userId = registeredUser?.id || registeredUser?.user_id;
    const userEmail = registeredUser?.email;
    const userRole = registeredUser?.role || 'user';
    if (!userId || !userEmail) {
      throw new Error('Failed to extract user identity for guardrail no-org token');
    }
    authTokenNoOrgContext = jwt.sign(
      { id: userId, email: userEmail, role: userRole },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    await pool.query(
      `INSERT INTO accounts (id, account_number, account_name, account_type, is_active)
       VALUES ($1, $2, $3, 'organization', true)
       ON CONFLICT (id) DO UPDATE
       SET account_name = EXCLUDED.account_name,
           is_active = EXCLUDED.is_active`,
      [activeOrgId, activeOrgAccountNumber, 'Guardrails Active Org']
    );
    await pool.query(
      `INSERT INTO accounts (id, account_number, account_name, account_type, is_active)
       VALUES ($1, $2, $3, 'organization', false)
       ON CONFLICT (id) DO UPDATE
       SET account_name = EXCLUDED.account_name,
           is_active = EXCLUDED.is_active`,
      [inactiveOrgId, inactiveOrgAccountNumber, 'Guardrails Inactive Org']
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [activeOrgId, inactiveOrgId]);
  });

  describe('auth-required route matrix', () => {
    it.each(AUTH_REQUIRED_CASES)('$name', async (testCase) => {
      const req = request(app)[testCase.method](testCase.path);
      if (testCase.payload) req.send(testCase.payload);

      const response = await req.expect(testCase.expectedStatus);
      expectCanonicalError(response, testCase.expectedCode);
    });
  });

  describe('validation-required route matrix', () => {
    it.each(VALIDATION_REQUIRED_CASES)('$name', async (testCase) => {
      const req = request(app)[testCase.method](testCase.path);
      if (testCase.payload) req.send(testCase.payload);

      const response = await req.expect(testCase.expectedStatus);
      expectCanonicalError(response, testCase.expectedCode);
    });
  });

  describe('validation-required route matrix (authenticated)', () => {
    it.each(AUTH_VALIDATION_REQUIRED_CASES)('$name', async (testCase) => {
      const req = request(app)[testCase.method](testCase.path)
        .set('Authorization', `Bearer ${authToken}`);
      if (testCase.withActiveOrgContext) {
        req.set('x-organization-id', activeOrgId);
      }

      if (testCase.payload) req.send(testCase.payload);

      const response = await req.expect(testCase.expectedStatus);
      expectCanonicalError(response, testCase.expectedCode);
    });
  });

  describe('tenant/org activation behavior matrix', () => {
    it('rejects missing org context on org-scoped routes', async () => {
      const response = await request(app)
        .get('/api/activities/recent')
        .set('Authorization', `Bearer ${authTokenNoOrgContext}`)
        .expect(400);

      expectCanonicalError(response, 'bad_request');
    });

    it('rejects unknown org context on org-scoped routes', async () => {
      const response = await request(app)
        .get('/api/activities/recent')
        .set('Authorization', `Bearer ${authTokenNoOrgContext}`)
        .set('x-organization-id', randomUUID())
        .expect(404);

      expectCanonicalError(response, 'not_found');
    });

    it('rejects inactive org context on org-scoped routes', async () => {
      const response = await request(app)
        .get('/api/activities/recent')
        .set('Authorization', `Bearer ${authTokenNoOrgContext}`)
        .set('x-organization-id', inactiveOrgId)
        .expect(403);

      expectCanonicalError(response, 'forbidden');
    });

    it('allows active org context through to downstream validators', async () => {
      const response = await request(app)
        .get('/api/activities/recent?limit=500')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', activeOrgId)
        .expect(400);

      expectCanonicalError(response, 'validation_error');
    });
  });

  describe('webhook-guardrail route matrix', () => {
    it.each(WEBHOOK_GUARDRAIL_CASES)('$name', async (testCase) => {
      const response = await request(app)[testCase.method](testCase.path)
        .set('Content-Type', 'application/json')
        .send(testCase.payload || {})
        .expect(testCase.expectedStatus);

      expectCanonicalError(response, testCase.expectedCode);
    });
  });

  describe('success envelope contract matrix', () => {
    it.each(SUCCESS_CONTRACT_CASES)('$name', async (testCase) => {
      const response = await request(app)[testCase.method](testCase.path).expect(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.anything(),
      });
    });
  });

  it('returns canonical 429 envelope with retry metadata when auth limiter is exceeded', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalRateLimitWindow = process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    const originalRateLimitMax = process.env.AUTH_RATE_LIMIT_MAX_REQUESTS;

    try {
      process.env.NODE_ENV = 'development';
      process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
      process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '2';

      jest.resetModules();

      const { authLimiter } = await import('../../middleware/rateLimiter');

      const rateLimitedApp = express();
      rateLimitedApp.set('trust proxy', 1);
      rateLimitedApp.use(express.json());
      rateLimitedApp.post('/guarded-login', authLimiter, (_req, res) => {
        res.status(401).json({ success: false });
      });

      await request(rateLimitedApp)
        .post('/guarded-login')
        .set('X-Forwarded-For', '203.0.113.10')
        .send({ email: 'rate-limit@example.com' })
        .expect(401);

      await request(rateLimitedApp)
        .post('/guarded-login')
        .set('X-Forwarded-For', '203.0.113.10')
        .send({ email: 'rate-limit@example.com' })
        .expect(401);

      const limited = await request(rateLimitedApp)
        .post('/guarded-login')
        .set('X-Forwarded-For', '203.0.113.10')
        .send({ email: 'rate-limit@example.com' })
        .expect(429);

      expectCanonicalError(limited, 'rate_limit_exceeded');
      expect(limited.body.error.details).toMatchObject({
        strategy: 'auth',
        retryAfter: expect.any(String),
        retryAfterSeconds: expect.any(Number),
      });
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.AUTH_RATE_LIMIT_WINDOW_MS = originalRateLimitWindow;
      process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = originalRateLimitMax;
    }
  });

  it('attaches correlation id header and body field for canonical failures', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('x-correlation-id', 'corr-guardrail-test')
      .send({})
      .expect(400);

    expect(response.headers['x-correlation-id']).toBe('corr-guardrail-test');
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'validation_error',
      },
      correlationId: 'corr-guardrail-test',
    });
  });

  it('falls back to generated correlation id when inbound value is invalid', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('x-correlation-id', 'bad')
      .send({})
      .expect(400);

    const responseCorrelationId = response.headers['x-correlation-id'];
    expect(responseCorrelationId).toEqual(expect.any(String));
    expect(responseCorrelationId).not.toBe('bad');
    expect(CORRELATION_ID_POLICY.test(responseCorrelationId)).toBe(true);
    expect(response.body.correlationId).toBe(responseCorrelationId);
  });

  it('returns machine-usable validation issues array', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({})
      .expect(400);

    expectCanonicalError(response, 'validation_error');
    expect(response.body.error.details).toMatchObject({
      issues: expect.any(Array),
      validation: expect.any(Object),
    });
    expect(response.body.error.details.issues[0]).toMatchObject({
      source: expect.stringMatching(/body|query|params/),
      path: expect.any(String),
      message: expect.any(String),
      code: expect.any(String),
    });
  });

  it('keeps validation detail contract parity for express-validator and zod routes', async () => {
    const expressValidatorResponse = await request(app)
      .post('/api/auth/register')
      .send({})
      .expect(400);

    const zodResponse = await request(app)
      .get('/api/activities/recent?limit=500')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-organization-id', activeOrgId)
      .expect(400);

    expect(expressValidatorResponse.body.error.details).toMatchObject({
      issues: expect.any(Array),
      validation: expect.any(Object),
    });
    expect(zodResponse.body.error.details).toMatchObject({
      issues: expect.any(Array),
      validation: expect.any(Object),
    });
  });

  it('returns provider webhook ack payloads without success-envelope wrapping for stale and duplicate paths', async () => {
    const staleWebhookApp = express();
    staleWebhookApp.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
    staleWebhookApp.post('/api/payments/webhook', handleWebhook);

    const paymentPool = { query: jest.fn() };
    setPaymentPool(paymentPool as any);

    const staleSpy = jest
      .spyOn(stripeService, 'constructWebhookEvent')
      .mockReturnValueOnce({
        id: 'evt-stale-guardrail',
        type: 'charge.refunded',
        created: new Date(Date.now() - 10 * 60 * 1000),
        data: { object: {} },
      } as any)
      .mockReturnValueOnce({
        id: 'evt-duplicate-guardrail',
        type: 'charge.refunded',
        created: new Date(),
        data: { object: {} },
      } as any);

    (paymentPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const staleResponse = await request(staleWebhookApp)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(200);

    expect(staleResponse.body).toEqual({ received: true, rejected: true });
    expect(staleResponse.body.success).toBeUndefined();

    const duplicateResponse = await request(staleWebhookApp)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(200);

    expect(duplicateResponse.body).toEqual({ received: true, duplicate: true });
    expect(duplicateResponse.body.success).toBeUndefined();

    staleSpy.mockRestore();
  });

  it('keeps correlation IDs isolated across concurrent requests', async () => {
    const firstCorrelationId = 'corr-route-guardrails-a1';
    const secondCorrelationId = 'corr-route-guardrails-b2';

    const [first, second] = await Promise.all([
      request(app)
        .post('/api/auth/register')
        .set('x-correlation-id', firstCorrelationId)
        .send({})
        .expect(400),
      request(app)
        .post('/api/auth/register')
        .set('x-correlation-id', secondCorrelationId)
        .send({})
        .expect(400),
    ]);

    expect(first.body.correlationId).toBe(firstCorrelationId);
    expect(second.body.correlationId).toBe(secondCorrelationId);
  });
});
