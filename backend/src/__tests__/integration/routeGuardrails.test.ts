import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../index';
import pool from '@config/database';
import { getJwtSecret } from '@config/jwt';
import { randomUUID } from 'crypto';
import { handleWebhook, setPaymentPool } from '@modules/payments/controllers/paymentController';
import stripeService from '@services/stripeService';

type GuardrailCase = {
  name: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  expectedStatus: number;
  expectedCode: string;
  payload?: Record<string, unknown>;
  withActiveOrgContext?: boolean;
  tokenKind?: 'user' | 'admin';
};

const AUTH_REQUIRED_CASES: GuardrailCase[] = [
  {
    name: 'accounts list requires auth',
    method: 'get',
    path: '/api/v2/accounts',
    expectedStatus: 401,
    expectedCode: 'unauthorized',
  },
  {
    name: 'current user requires auth',
    method: 'get',
    path: '/api/v2/auth/me',
    expectedStatus: 401,
    expectedCode: 'unauthorized',
  },
  {
    name: 'webhook endpoint list requires auth',
    method: 'get',
    path: '/api/v2/webhooks/endpoints',
    expectedStatus: 401,
    expectedCode: 'unauthorized',
  },
  {
    name: 'social media settings require auth',
    method: 'get',
    path: '/api/v2/social-media/facebook/settings',
    expectedStatus: 401,
    expectedCode: 'unauthorized',
  },
  {
    name: 'task create requires auth',
    method: 'post',
    path: '/api/v2/tasks',
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
    path: '/api/v2/auth/register',
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
    path: '/api/v2/auth/login',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    payload: {
      email: 'bad-email',
    },
  },
  {
    name: 'setup validates payload',
    method: 'post',
    path: '/api/v2/auth/setup',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    payload: {},
  },
];

const AUTH_VALIDATION_REQUIRED_CASES: GuardrailCase[] = [
  {
    name: 'activities recent enforces query bounds',
    method: 'get',
    path: '/api/v2/activities/recent?limit=500',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    withActiveOrgContext: true,
  },
  {
    name: 'activities recent rejects unknown query keys',
    method: 'get',
    path: '/api/v2/activities/recent?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    withActiveOrgContext: true,
  },
  {
    name: 'external service provider create enforces body schema',
    method: 'post',
    path: '/api/v2/external-service-providers',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    payload: {},
    withActiveOrgContext: true,
  },
  {
    name: 'reconciliation endpoints enforce UUID params',
    method: 'get',
    path: '/api/v2/reconciliation/not-a-uuid',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    withActiveOrgContext: true,
  },
  {
    name: 'saved reports list enforces entity enum query',
    method: 'get',
    path: '/api/v2/saved-reports?entity=not-a-valid-entity',
    expectedStatus: 400,
    expectedCode: 'validation_error',
  },
  {
    name: 'admin audit logs enforces query bounds',
    method: 'get',
    path: '/api/v2/admin/audit-logs?limit=500',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'admin audit logs rejects unknown query keys',
    method: 'get',
    path: '/api/v2/admin/audit-logs?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'admin pending registrations enforces status enum query',
    method: 'get',
    path: '/api/v2/admin/pending-registrations?status=invalid',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'admin pending registrations reject unknown query keys',
    method: 'get',
    path: '/api/v2/admin/pending-registrations?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'users list enforces is_active boolean query',
    method: 'get',
    path: '/api/v2/users?is_active=maybe',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'users list rejects unknown query keys',
    method: 'get',
    path: '/api/v2/users?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'portal admin users enforces search query shape',
    method: 'get',
    path: '/api/v2/portal/admin/users?search=alpha&search=beta',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'portal admin users reject unknown query keys',
    method: 'get',
    path: '/api/v2/portal/admin/users?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'portal user activity enforces query bounds',
    method: 'get',
    path: '/api/v2/portal/admin/users/11111111-1111-4111-8111-111111111111/activity?limit=500',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'templates search rejects unknown query keys',
    method: 'get',
    path: '/api/v2/templates?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'v2 tasks list rejects unknown query keys',
    method: 'get',
    path: '/api/v2/tasks?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'v2 volunteers list rejects unknown query keys',
    method: 'get',
    path: '/api/v2/volunteers?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
    withActiveOrgContext: true,
  },
  {
    name: 'v2 case document download rejects unknown query keys',
    method: 'get',
    path: '/api/v2/cases/11111111-1111-4111-8111-111111111111/documents/22222222-2222-4222-8222-222222222222/download?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
    withActiveOrgContext: true,
  },
  {
    name: 'webhook deliveries reject unknown query keys',
    method: 'get',
    path: '/api/v2/webhooks/endpoints/11111111-1111-4111-8111-111111111111/deliveries?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'api key usage rejects unknown query keys',
    method: 'get',
    path: '/api/v2/webhooks/api-keys/11111111-1111-4111-8111-111111111111/usage?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    tokenKind: 'admin',
  },
  {
    name: 'v2 report templates enforce category enum query',
    method: 'get',
    path: '/api/v2/reports/templates?category=invalid-category',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    withActiveOrgContext: true,
    tokenKind: 'admin',
  },
  {
    name: 'social media snapshot route enforces UUID params',
    method: 'get',
    path: '/api/v2/social-media/facebook/pages/not-a-uuid/snapshots',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    withActiveOrgContext: true,
    tokenKind: 'admin',
  },
  {
    name: 'v2 report templates reject unknown query keys',
    method: 'get',
    path: '/api/v2/reports/templates?unknown=true',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    withActiveOrgContext: true,
    tokenKind: 'admin',
  },
  {
    name: 'legacy report templates enforce category enum query',
    method: 'get',
    path: '/api/v2/reports/templates?category=invalid-category',
    expectedStatus: 400,
    expectedCode: 'validation_error',
    withActiveOrgContext: true,
    tokenKind: 'admin',
  },
];

const WEBHOOK_GUARDRAIL_CASES: GuardrailCase[] = [
  {
    name: 'stripe webhook requires signature',
    method: 'post',
    path: '/api/v2/payments/webhook',
    expectedStatus: 400,
    expectedCode: 'bad_request',
    payload: {},
  },
];

const SUCCESS_CONTRACT_CASES: Array<{
  name: string;
  method: 'get' | 'post';
  path: string;
  tokenKind?: 'user' | 'admin';
}> = [
  {
    name: 'auth setup-status success envelope',
    method: 'get',
    path: '/api/v2/auth/setup-status',
  },
  {
    name: 'payments config success envelope',
    method: 'get',
    path: '/api/v2/payments/config',
  },
  {
    name: 'admin roles success envelope',
    method: 'get',
    path: '/api/v2/admin/roles',
    tokenKind: 'admin',
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
  let authTokenAdmin: string;
  let guardrailUserIdentity: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null = null;
  const activeOrgId = randomUUID();
  const inactiveOrgId = randomUUID();
  const activeOrgAccountNumber = `GR-ACT-${activeOrgId.slice(0, 8)}`;
  const inactiveOrgAccountNumber = `GR-INACT-${inactiveOrgId.slice(0, 8)}`;
  const buildToken = (
    role: 'user' | 'admin',
    options?: {
      includeOrgContext?: boolean;
    }
  ): string => {
    if (!guardrailUserIdentity) {
      throw new Error('Guardrail user identity has not been initialized');
    }

    const includeOrgContext = options?.includeOrgContext ?? true;
    return jwt.sign(
      {
        id: guardrailUserIdentity.id,
        email: guardrailUserIdentity.email,
        role,
        ...(includeOrgContext ? { organizationId: activeOrgId } : {}),
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
  };

  const refreshAuthTokens = (): void => {
    authToken = buildToken('user', { includeOrgContext: true });
    authTokenNoOrgContext = buildToken('user', { includeOrgContext: false });
    authTokenAdmin = buildToken('admin', { includeOrgContext: true });
  };

  const ensureGuardrailUserExists = async (): Promise<void> => {
    if (!guardrailUserIdentity) return;

    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'user', true, NOW(), NOW())
       ON CONFLICT (id)
       DO UPDATE SET
         email = EXCLUDED.email,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         role = 'user',
         is_active = true,
         updated_at = NOW()`,
      [
        guardrailUserIdentity.id,
        guardrailUserIdentity.email,
        '$2b$10$2B5xCiFv0to6v3sQm6rQOu/xM2bYf7jdd2fNf7q5sWubEjkVif7PO',
        guardrailUserIdentity.firstName,
        guardrailUserIdentity.lastName,
      ]
    );
  };

  const upsertGuardrailOrgs = async (): Promise<void> => {
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
  };

  beforeAll(async () => {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email: `guardrails-${unique}@example.com`,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Guardrail',
        last_name: 'Tester',
      })
      .expect(201);

    const registeredUser =
      registerResponse.body.user ||
      registerResponse.body?.data?.user;
    const userId = registeredUser?.id || registeredUser?.user_id;
    const userEmail = registeredUser?.email;
    if (!userId || !userEmail) {
      throw new Error('Failed to extract user identity for guardrail no-org token');
    }
    guardrailUserIdentity = {
      id: userId,
      email: userEmail,
      firstName: registeredUser?.firstName || registeredUser?.first_name || 'Guardrail',
      lastName: registeredUser?.lastName || registeredUser?.last_name || 'Tester',
    };

    await ensureGuardrailUserExists();
    refreshAuthTokens();
    await upsertGuardrailOrgs();
  });

  beforeEach(async () => {
    await ensureGuardrailUserExists();
    await upsertGuardrailOrgs();
    await pool.query(
      `CREATE TABLE IF NOT EXISTS organization_settings (
        organization_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );
    await pool.query('DELETE FROM organization_settings WHERE organization_id = $1', [activeOrgId]);
    refreshAuthTokens();
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
      if (testCase.expectedCode === 'validation_error') {
        expect(response.body.error.details).toMatchObject({
          issues: expect.any(Array),
          validation: expect.any(Object),
        });
      }
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
      const token = testCase.tokenKind === 'admin' ? authTokenAdmin : authToken;
      const req = request(app)[testCase.method](testCase.path)
        .set('Authorization', `Bearer ${token}`);
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
        .get('/api/v2/activities/recent')
        .set('Authorization', `Bearer ${authTokenNoOrgContext}`)
        .expect(400);

      expectCanonicalError(response, 'bad_request');
    });

    it('rejects unknown org context on org-scoped routes', async () => {
      const response = await request(app)
        .get('/api/v2/activities/recent')
        .set('Authorization', `Bearer ${authTokenNoOrgContext}`)
        .set('x-organization-id', randomUUID())
        .expect(404);

      expectCanonicalError(response, 'not_found');
    });

    it('rejects inactive org context on org-scoped routes', async () => {
      const response = await request(app)
        .get('/api/v2/activities/recent')
        .set('Authorization', `Bearer ${authTokenNoOrgContext}`)
        .set('x-organization-id', inactiveOrgId)
        .expect(403);

      expectCanonicalError(response, 'forbidden');
    });

    it('allows active org context through to downstream validators', async () => {
      const response = await request(app)
        .get('/api/v2/activities/recent?limit=500')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', activeOrgId)
        .expect(400);

      expectCanonicalError(response, 'validation_error');
    });
  });

  describe('workspace module controls', () => {
    it('allows admin users to read and update organization workspace modules', async () => {
      const readResponse = await request(app)
        .get('/api/v2/admin/organization-settings')
        .set('Authorization', `Bearer ${authTokenAdmin}`)
        .set('x-organization-id', activeOrgId)
        .expect(200);

      expect(readResponse.body.data.config.workspaceModules.cases).toBe(true);

      const updateResponse = await request(app)
        .put('/api/v2/admin/organization-settings')
        .set('Authorization', `Bearer ${authTokenAdmin}`)
        .set('x-organization-id', activeOrgId)
        .send({
          config: {
            ...readResponse.body.data.config,
            workspaceModules: {
              ...readResponse.body.data.config.workspaceModules,
              cases: false,
              reports: false,
            },
          },
        })
        .expect(200);

      expect(updateResponse.body.data.config.workspaceModules.cases).toBe(false);
      expect(updateResponse.body.data.config.workspaceModules.reports).toBe(false);
      expect(updateResponse.body.data.config.name).toBe(readResponse.body.data.config.name);
    });

    it('rejects non-admin users updating organization workspace modules', async () => {
      const response = await request(app)
        .put('/api/v2/admin/organization-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', activeOrgId)
        .send({
          config: {
            name: '',
            email: '',
            phone: '',
            website: '',
            address: {
              line1: '',
              line2: '',
              city: '',
              province: '',
              postalCode: '',
              country: 'Canada',
            },
            timezone: 'America/Vancouver',
            dateFormat: 'YYYY-MM-DD',
            currency: 'CAD',
            fiscalYearStart: '04',
            measurementSystem: 'metric',
            phoneFormat: 'canadian',
            taxReceipt: {
              legalName: '',
              charitableRegistrationNumber: '',
              receiptingAddress: {
                line1: '',
                line2: '',
                city: '',
                province: '',
                postalCode: '',
                country: 'Canada',
              },
              receiptIssueLocation: '',
              authorizedSignerName: '',
              authorizedSignerTitle: '',
              contactEmail: '',
              contactPhone: '',
              advantageAmount: 0,
            },
            workspaceModules: {
              cases: false,
            },
          },
        })
        .expect(403);

      expectCanonicalError(response, 'forbidden');
    });

    it('blocks disabled workspace module routes with a canonical disabled response', async () => {
      await request(app)
        .put('/api/v2/admin/organization-settings')
        .set('Authorization', `Bearer ${authTokenAdmin}`)
        .set('x-organization-id', activeOrgId)
        .send({
          config: {
            name: '',
            email: '',
            phone: '',
            website: '',
            address: {
              line1: '',
              line2: '',
              city: '',
              province: '',
              postalCode: '',
              country: 'Canada',
            },
            timezone: 'America/Vancouver',
            dateFormat: 'YYYY-MM-DD',
            currency: 'CAD',
            fiscalYearStart: '04',
            measurementSystem: 'metric',
            phoneFormat: 'canadian',
            taxReceipt: {
              legalName: '',
              charitableRegistrationNumber: '',
              receiptingAddress: {
                line1: '',
                line2: '',
                city: '',
                province: '',
                postalCode: '',
                country: 'Canada',
              },
              receiptIssueLocation: '',
              authorizedSignerName: '',
              authorizedSignerTitle: '',
              contactEmail: '',
              contactPhone: '',
              advantageAmount: 0,
            },
            workspaceModules: {
              cases: false,
              teamChat: true,
            },
          },
        })
        .expect(200);

      const disabledResponse = await request(app)
        .get('/api/v2/cases')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', activeOrgId)
        .expect(404);

      expectCanonicalError(disabledResponse, 'MODULE_DISABLED');
      expect(disabledResponse.body.error.details).toMatchObject({ module: 'cases' });
    });

    it('preserves route-level validation behavior when no org context is selected', async () => {
      const response = await request(app)
        .get('/api/v2/alerts/instances?limit=500')
        .set('Authorization', `Bearer ${authTokenNoOrgContext}`)
        .expect(400);

      expectCanonicalError(response, 'validation_error');
    });

    it('still honors the global team-chat flag when org settings enable the module', async () => {
      await request(app)
        .put('/api/v2/admin/organization-settings')
        .set('Authorization', `Bearer ${authTokenAdmin}`)
        .set('x-organization-id', activeOrgId)
        .send({
          config: {
            name: '',
            email: '',
            phone: '',
            website: '',
            address: {
              line1: '',
              line2: '',
              city: '',
              province: '',
              postalCode: '',
              country: 'Canada',
            },
            timezone: 'America/Vancouver',
            dateFormat: 'YYYY-MM-DD',
            currency: 'CAD',
            fiscalYearStart: '04',
            measurementSystem: 'metric',
            phoneFormat: 'canadian',
            taxReceipt: {
              legalName: '',
              charitableRegistrationNumber: '',
              receiptingAddress: {
                line1: '',
                line2: '',
                city: '',
                province: '',
                postalCode: '',
                country: 'Canada',
              },
              receiptIssueLocation: '',
              authorizedSignerName: '',
              authorizedSignerTitle: '',
              contactEmail: '',
              contactPhone: '',
              advantageAmount: 0,
            },
            workspaceModules: {
              teamChat: true,
            },
          },
        })
        .expect(200);

      const originalTeamChatEnabled = process.env.TEAM_CHAT_ENABLED;
      process.env.TEAM_CHAT_ENABLED = 'false';

      try {
        const response = await request(app)
          .get('/api/v2/team-chat/inbox')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-organization-id', activeOrgId)
          .expect(404);

        expectCanonicalError(response, 'TEAM_CHAT_DISABLED');
      } finally {
        if (originalTeamChatEnabled === undefined) {
          delete process.env.TEAM_CHAT_ENABLED;
        } else {
          process.env.TEAM_CHAT_ENABLED = originalTeamChatEnabled;
        }
      }
    });
  });

  describe('strict org-context setup/auth bypass behavior', () => {
    const originalOrgContextRequire = process.env.ORG_CONTEXT_REQUIRE;

    beforeAll(() => {
      process.env.ORG_CONTEXT_REQUIRE = 'true';
    });

    afterAll(() => {
      process.env.ORG_CONTEXT_REQUIRE = originalOrgContextRequire;
    });

    it('does not block setup-status behind org-context requirement', async () => {
      const response = await request(app).get('/api/v2/auth/setup-status').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          setupRequired: expect.any(Boolean),
          userCount: expect.any(Number),
        },
      });
    });

    it('keeps login behavior as auth semantics (not org-context bad request)', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: `guardrails-missing-user-${Date.now()}@example.com`,
          password: 'InvalidPassword123!',
        })
        .expect(401);

      expectCanonicalError(response, 'unauthorized');
      expect(response.body.error.message).not.toMatch(/organization context is required/i);
    });

    it('keeps setup validation errors as validation semantics (not org-context bad request)', async () => {
      const response = await request(app)
        .post('/api/v2/auth/setup')
        .send({})
        .expect(400);

      expectCanonicalError(response, 'validation_error');
      expect(response.body.error.message).not.toMatch(/organization context is required/i);
    });

    it('still enforces organization context on org-scoped business routes', async () => {
      const response = await request(app)
        .get('/api/v2/activities/recent')
        .set('Authorization', `Bearer ${authTokenNoOrgContext}`)
        .expect(400);

      expectCanonicalError(response, 'bad_request');
      expect(response.body.error.message).toMatch(/no organization context/i);
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
      const req = request(app)[testCase.method](testCase.path);
      if (testCase.tokenKind) {
        const token = testCase.tokenKind === 'admin' ? authTokenAdmin : authToken;
        req.set('Authorization', `Bearer ${token}`);
      }

      const response = await req.expect(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.anything(),
      });
    });

    it('portal admin requests list uses canonical success envelope', async () => {
      const response = await request(app)
        .get('/api/v2/portal/admin/requests')
        .set('Authorization', `Bearer ${authTokenAdmin}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          requests: expect.any(Array),
        },
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
      .post('/api/v2/auth/register')
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
      .post('/api/v2/auth/register')
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
      .post('/api/v2/auth/register')
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

  it('keeps validation detail contract parity across legacy and zod validation routes', async () => {
    const legacyValidationResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({})
      .expect(400);

    const zodResponse = await request(app)
      .get('/api/v2/activities/recent?limit=500')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-organization-id', activeOrgId)
      .expect(400);

    expect(legacyValidationResponse.body.error.details).toMatchObject({
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
    staleWebhookApp.use('/api/v2/payments/webhook', express.raw({ type: 'application/json' }));
    staleWebhookApp.post('/api/v2/payments/webhook', handleWebhook);

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
      .post('/api/v2/payments/webhook')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(200);

    expect(staleResponse.body).toEqual({ received: true, rejected: true });
    expect(staleResponse.body.success).toBeUndefined();

    const duplicateResponse = await request(staleWebhookApp)
      .post('/api/v2/payments/webhook')
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
        .post('/api/v2/auth/register')
        .set('x-correlation-id', firstCorrelationId)
        .send({})
        .expect(400),
      request(app)
        .post('/api/v2/auth/register')
        .set('x-correlation-id', secondCorrelationId)
        .send({})
        .expect(400),
    ]);

    expect(first.body.correlationId).toBe(firstCorrelationId);
    expect(second.body.correlationId).toBe(secondCorrelationId);
  });
});
