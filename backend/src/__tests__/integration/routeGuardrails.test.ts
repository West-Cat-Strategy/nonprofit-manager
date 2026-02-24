import express from 'express';
import request from 'supertest';
import app from '../../index';

type GuardrailCase = {
  name: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  expectedStatus: number;
  expectedCode: string;
  payload?: Record<string, unknown>;
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

describe('Route Guardrails Integration', () => {
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
});
