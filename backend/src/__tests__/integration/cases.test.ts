import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Case API Integration Tests', () => {
  let authToken: string;
  let testEmail: string;
  let userId = '';
  let organizationId = '';
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

  beforeAll(async () => {
    testEmail = `cases-test-${unique()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email: testEmail,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Case',
        last_name: 'Tester',
      });

    const registerPayload = unwrap<{
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }>(registerResponse.body);
    const registeredUser = registerPayload.user;
    if (!registeredUser?.id) {
      throw new Error('Failed to register case integration test user');
    }
    userId = registeredUser.id;

    const orgResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM accounts
       WHERE account_type = 'organization'
         AND COALESCE(is_active, true) = true
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (orgResult.rows[0]?.id) {
      organizationId = orgResult.rows[0].id;
    } else {
      const createdOrg = await pool.query<{ id: string }>(
        `INSERT INTO accounts (account_name, account_type, created_by, modified_by, created_at, updated_at)
         VALUES ($1, 'organization', $2, $2, NOW(), NOW())
         RETURNING id`,
        [`Case Test Organization ${unique()}`, userId]
      );
      organizationId = createdOrg.rows[0].id;
    }

    authToken = jwt.sign(
      {
        id: userId,
        email: registeredUser.email ?? testEmail,
        role: registeredUser.role ?? 'user',
        organizationId,
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (organizationId && userId) {
      // `accounts.created_by` references `users.id`, so remove test-created org rows first.
      await pool.query('DELETE FROM accounts WHERE id = $1 AND created_by = $2', [organizationId, userId]);
    }
    if (testEmail) {
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail.toLowerCase()]);
    }
  });

  it('requires auth for v2 list endpoint', async () => {
    await request(app).get('/api/v2/cases').expect(401);
  });

  it('returns tombstone response for v1 list endpoint', async () => {
    const response = await request(app)
      .get('/api/cases')
      .expect(410);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error.code', 'legacy_api_removed');
    expect(response.body).toHaveProperty('error.details.legacyPath', '/api/cases');
    expect(response.body).toHaveProperty('error.details.migrationPath', '/api/v2/cases');
  });

  it('serves v2 list with success envelope', async () => {
    const response = await request(app)
      .get('/api/v2/cases')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data.cases)).toBe(true);
  });

  it('tombstones v1 metadata endpoint and serves v2 metadata endpoint', async () => {
    const v1Types = await request(app)
      .get('/api/cases/types')
      .expect(410);

    const v2Types = await request(app)
      .get('/api/v2/cases/types')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(v1Types.body).toHaveProperty('success', false);
    expect(v1Types.body).toHaveProperty('error.code', 'legacy_api_removed');
    expect(v1Types.body).toHaveProperty('error.details.legacyPath', '/api/cases/types');
    expect(v1Types.body).toHaveProperty('error.details.migrationPath', '/api/v2/cases/types');
    expect(v2Types.body).toHaveProperty('success', true);
    expect(Array.isArray(v2Types.body.data)).toBe(true);
  });
});
