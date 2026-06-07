import request, { type Test } from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import {
  createIntegrationAuthContext,
  deleteIntegrationAuthFixtures,
} from './helpers/authFixtures';

describe('Admin Branding API', () => {
  let adminToken = '';
  let userToken = '';
  let adminUserId = '';
  let userId = '';
  let adminOrgId = '';
  let userOrgId = '';
  const originalConfigs = new Map<string, unknown>();

  const withAdminAuth = (req: Test): Test =>
    req
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', adminOrgId);

  const withUserAuth = (req: Test): Test =>
    req
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-Organization-Id', userOrgId);

  beforeAll(async () => {
    // Ensure table exists (keeps the test self-contained even if migrations haven't been applied locally).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_branding (
        organization_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    const adminContext = await createIntegrationAuthContext({
      emailPrefix: 'branding-admin',
      accountName: `Branding Admin Org ${Date.now()}`,
      role: 'admin',
    });
    adminUserId = adminContext.userId;
    adminOrgId = adminContext.organizationId;
    adminToken = adminContext.authToken;

    const userContext = await createIntegrationAuthContext({
      emailPrefix: 'branding-user',
      accountName: `Branding User Org ${Date.now()}`,
      role: 'user',
    });
    userId = userContext.userId;
    userOrgId = userContext.organizationId;
    userToken = userContext.authToken;

    for (const organizationId of Array.from(new Set([adminOrgId, userOrgId]))) {
      const snapshot = await pool.query(
        'SELECT config FROM organization_branding WHERE organization_id = $1',
        [organizationId]
      );
      originalConfigs.set(organizationId, snapshot.rows[0]?.config ?? {});
      await pool.query(
        `INSERT INTO organization_branding (organization_id, config)
         VALUES ($1, '{}'::jsonb)
         ON CONFLICT (organization_id) DO NOTHING`,
        [organizationId]
      );
    }
  });

  afterAll(async () => {
    // Restore branding row to avoid bleeding state into other test files/environments.
    try {
      for (const [organizationId, config] of originalConfigs.entries()) {
        await pool.query(
          `INSERT INTO organization_branding (organization_id, config, created_at, updated_at)
           VALUES ($1, $2::jsonb, NOW(), NOW())
           ON CONFLICT (organization_id)
           DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
          [organizationId, JSON.stringify(config ?? {})]
        );
      }
    } catch {
      // ignore
    }

    try {
      await deleteIntegrationAuthFixtures({
        userIds: [adminUserId, userId].filter(Boolean),
        organizationIds: [adminOrgId, userOrgId].filter(Boolean),
      });
    } catch {
      // ignore
    }
  });

  it('allows authenticated users to read branding', async () => {
    const response = await withUserAuth(request(app).get('/api/v2/admin/branding'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.any(Object),
      })
    );
  });

  it('rejects non-admin updates', async () => {
    const response = await withUserAuth(request(app).put('/api/v2/admin/branding'))
      .send({
        appName: 'Should Not Save',
        appIcon: null,
        primaryColour: '#000000',
        secondaryColour: '#ffffff',
        favicon: null,
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'forbidden',
        }),
      })
    );
  });

  it('allows admin to update branding and returns persisted config', async () => {
    const payload = {
      appName: `My Branded App ${Date.now()}`,
      appIcon: null,
      primaryColour: '#123456',
      secondaryColour: '#abcdef',
      favicon: null,
    };

    const putResponse = await withAdminAuth(request(app).put('/api/v2/admin/branding'))
      .send(payload);

    expect(putResponse.status).toBe(200);
    expect(putResponse.body.success).toBe(true);
    expect(putResponse.body.data).toEqual(expect.objectContaining(payload));
    expect(putResponse.body.appName).toBe(payload.appName);
    expect(putResponse.body.primaryColour).toBe(payload.primaryColour);

    const getResponse = await withAdminAuth(request(app).get('/api/v2/admin/branding'));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data).toEqual(expect.objectContaining(payload));
    expect(getResponse.body.appName).toBe(payload.appName);
    expect(getResponse.body.secondaryColour).toBe(payload.secondaryColour);
  });
});
