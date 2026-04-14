import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Webhooks API Integration', () => {
  let userId: string;
  let managerUserId: string;
  let organizationId: string;
  let authToken: string;
  let managerAuthToken: string;

  const safeDelete = async (query: string, params: unknown[]) => {
    try {
      await pool.query(query, params);
    } catch {
      // Ignore cleanup failures from optional tables.
    }
  };

  const authed = (
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    token = authToken
  ) => request(app)[method](path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    userId = randomUUID();
    organizationId = randomUUID();
    const email = `webhooks-int-${Date.now()}@example.com`;

    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())`,
      [userId, email, 'integration-test-hash', 'Webhook', 'Tester', 'admin']
    );

    managerUserId = randomUUID();
    const managerEmail = `webhooks-manager-${Date.now()}@example.com`;
    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())`,
      [managerUserId, managerEmail, 'integration-test-hash', 'Webhook', 'Manager', 'manager']
    );

    await pool.query(
      `INSERT INTO accounts (
         id,
         account_number,
         account_name,
         account_type,
         is_active,
         created_by,
         modified_by,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, 'organization', TRUE, $4, $4, NOW(), NOW())`,
      [organizationId, `ORG-${Date.now()}`, 'Webhook Integration Org', userId]
    );

    authToken = jwt.sign(
      {
        id: userId,
        email,
        role: 'admin',
        organizationId,
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    managerAuthToken = jwt.sign(
      {
        id: managerUserId,
        email: managerEmail,
        role: 'manager',
        organizationId,
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await safeDelete(
      'DELETE FROM api_key_rate_limit_state WHERE api_key_id IN (SELECT id FROM api_keys WHERE organization_id = $1)',
      [organizationId]
    );
    await safeDelete(
      'DELETE FROM api_key_usage_log WHERE api_key_id IN (SELECT id FROM api_keys WHERE organization_id = $1)',
      [organizationId]
    );
    await safeDelete('DELETE FROM api_keys WHERE organization_id = $1', [organizationId]);
    await safeDelete(
      'DELETE FROM webhook_deliveries WHERE webhook_endpoint_id IN (SELECT id FROM webhook_endpoints WHERE user_id = $1)',
      [userId]
    );
    await safeDelete('DELETE FROM webhook_endpoints WHERE user_id = $1', [userId]);
    await safeDelete('DELETE FROM accounts WHERE id = $1', [organizationId]);
    await safeDelete('DELETE FROM users WHERE id = $1', [managerUserId]);
    await safeDelete('DELETE FROM users WHERE id = $1', [userId]);
  });

  it('requires authentication for webhook endpoints', async () => {
    await request(app).get('/api/v2/webhooks/endpoints').expect(401);
  });

  it('requires authentication for API key listing', async () => {
    await request(app).get('/api/v2/webhooks/api-keys').expect(401);
  });

  it('denies non-admin access to webhook management routes', async () => {
    await authed('get', '/api/v2/webhooks/endpoints', managerAuthToken).expect(403);
    await authed('post', '/api/v2/webhooks/api-keys', managerAuthToken)
      .send({
        name: 'Denied Key',
        scopes: ['read:contacts'],
      })
      .expect(403);
    await authed('get', '/api/v2/webhooks/api-keys/scopes', managerAuthToken).expect(403);
  });

  it('supports webhook endpoint create, get, and update without exposing the secret on readback', async () => {
    const created = await authed('post', '/api/v2/webhooks/endpoints')
      .send({
        url: 'https://8.8.8.8/webhook',
        description: 'Initial endpoint',
        events: ['contact.created'],
      })
      .expect(201);

    expect(created.body.success).toBe(true);
    expect(created.body.data).toEqual(
      expect.objectContaining({
        url: 'https://8.8.8.8/webhook',
        description: 'Initial endpoint',
        secret: expect.stringMatching(/^whsec_/),
      })
    );

    const endpointId = created.body.data.id as string;

    const fetched = await authed('get', `/api/v2/webhooks/endpoints/${endpointId}`).expect(200);

    expect(fetched.body.success).toBe(true);
    expect(fetched.body.data).toEqual(
      expect.objectContaining({
        id: endpointId,
        url: 'https://8.8.8.8/webhook',
        description: 'Initial endpoint',
      })
    );
    expect(fetched.body.data).not.toHaveProperty('secret');

    const updated = await authed('put', `/api/v2/webhooks/endpoints/${endpointId}`)
      .send({
        url: 'https://8.8.8.8/updated-webhook',
        description: 'Updated endpoint',
        isActive: false,
      })
      .expect(200);

    expect(updated.body.success).toBe(true);
    expect(updated.body.data).toEqual(
      expect.objectContaining({
        id: endpointId,
        url: 'https://8.8.8.8/updated-webhook',
        description: 'Updated endpoint',
        isActive: false,
      })
    );
    expect(updated.body.data).not.toHaveProperty('secret');
  });

  it('supports organization-scoped API key lifecycle routes', async () => {
    const created = await authed('post', '/api/v2/webhooks/api-keys')
      .send({
        name: 'Integration Key',
        scopes: ['read:contacts', 'read:reports'],
      })
      .expect(201);

    expect(created.body.success).toBe(true);
    expect(created.body.data).toEqual(
      expect.objectContaining({
        name: 'Integration Key',
        organizationId,
        createdBy: userId,
        status: 'active',
        isActive: true,
        key: expect.stringMatching(/^npm_/),
        scopes: ['read:contacts', 'read:reports'],
      })
    );

    const availableScopes = await authed('get', '/api/v2/webhooks/api-keys/scopes').expect(200);
    expect(Array.isArray(availableScopes.body.data)).toBe(true);
    expect(availableScopes.body.data.map((entry: { scope: string }) => entry.scope)).not.toContain(
      'admin'
    );

    const keyId = created.body.data.id as string;

    const listed = await authed('get', '/api/v2/webhooks/api-keys').expect(200);

    expect(listed.body.success).toBe(true);
    expect(listed.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: keyId,
          organizationId,
          createdBy: userId,
          status: 'active',
        }),
      ])
    );

    const fetched = await authed('get', `/api/v2/webhooks/api-keys/${keyId}`).expect(200);

    expect(fetched.body.success).toBe(true);
    expect(fetched.body.data).toEqual(
      expect.objectContaining({
        id: keyId,
        organizationId,
        createdBy: userId,
        status: 'active',
      })
    );
    expect(fetched.body.data).not.toHaveProperty('keyHash');

    const usage = await authed('get', `/api/v2/webhooks/api-keys/${keyId}/usage?limit=25`).expect(200);

    expect(usage.body.success).toBe(true);
    expect(Array.isArray(usage.body.data)).toBe(true);

    const revoked = await authed('post', `/api/v2/webhooks/api-keys/${keyId}/revoke`)
      .send({})
      .expect(200);

    expect(revoked.body.success).toBe(true);
    expect(revoked.body.data).toEqual({ message: 'API key revoked' });

    const fetchedAfterRevoke = await authed('get', `/api/v2/webhooks/api-keys/${keyId}`).expect(200);

    expect(fetchedAfterRevoke.body.data).toEqual(
      expect.objectContaining({
        id: keyId,
        status: 'revoked',
        isActive: false,
      })
    );
  });

  it('rejects privileged scopes in API key creation requests', async () => {
    await authed('post', '/api/v2/webhooks/api-keys')
      .send({
        name: 'Invalid Scope Key',
        scopes: ['admin'],
      })
      .expect(400);
  });
});
