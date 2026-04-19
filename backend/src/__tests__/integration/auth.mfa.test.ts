import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { encrypt } from '../../utils/encryption';
import { getJwtSecret } from '../../config/jwt';
import { enrollTotpSecret, generateTotpCodeForTest } from '../../modules/auth/lib/totp';

describe('Auth MFA Integration Tests', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const mfaEmail = `auth-mfa-${unique()}@example.com`;
  const mfaPassword = 'StrongPassword123!';
  const { secret: mfaSecret } = enrollTotpSecret(mfaEmail, 'Nonprofit Manager');
  let expectedOrganizationId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(mfaPassword, 10);

    const userResult = await pool.query<{ id: string }>(
      `INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        role,
        mfa_totp_enabled,
        mfa_totp_secret_enc,
        created_at,
        updated_at
      )
      VALUES ($1, $2, 'Mfa', 'User', 'user', TRUE, $3, NOW(), NOW())
      RETURNING id`,
      [mfaEmail, passwordHash, encrypt(mfaSecret)]
    );

    const userId = userResult.rows[0].id;

    const existingOrganization = await pool.query<{ id: string }>(
      `SELECT id
       FROM accounts
       WHERE account_type = 'organization'
         AND COALESCE(is_active, true) = true
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (existingOrganization.rows[0]?.id) {
      expectedOrganizationId = existingOrganization.rows[0].id;
    } else {
      const createdOrganization = await pool.query<{ id: string }>(
        `INSERT INTO accounts (account_name, account_type, created_by, modified_by)
         VALUES ($1, 'organization', $2, $2)
         RETURNING id`,
        [`MFA Test Org ${unique()}`, userId]
      );

      expectedOrganizationId = createdOrganization.rows[0].id;
    }

    await pool.query(
      `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
       VALUES ($1, $2, 'viewer', $1, TRUE)
       ON CONFLICT (user_id, account_id)
       DO UPDATE SET
         access_level = EXCLUDED.access_level,
         granted_by = EXCLUDED.granted_by,
         is_active = TRUE`,
      [userId, expectedOrganizationId]
    );
  });

  afterAll(async () => {
    const safeDelete = async (query: string, params: unknown[]) => {
      try {
        await pool.query(query, params);
      } catch {
        // Ignore missing tables in partial test DBs.
      }
    };

    const users = await pool.query(
      "SELECT id FROM users WHERE email LIKE '%auth-mfa-%'"
    );
    const userIds = users.rows.map((row: { id: string }) => row.id);
    if (userIds.length === 0) {
      return;
    }

    await safeDelete('DELETE FROM user_roles WHERE user_id = ANY($1)', [userIds]);
    await safeDelete('DELETE FROM user_account_access WHERE user_id = ANY($1)', [userIds]);
    await safeDelete('DELETE FROM audit_logs WHERE user_id = ANY($1)', [userIds]);
    await safeDelete('DELETE FROM accounts WHERE created_by = ANY($1)', [userIds]);
    await safeDelete('DELETE FROM users WHERE id = ANY($1)', [userIds]);
  });

  it('requires MFA on password login for TOTP-enabled users', async () => {
    const response = await request(app)
      .post('/api/v2/auth/login')
      .send({
        email: mfaEmail.toUpperCase(),
        password: mfaPassword,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      mfaRequired: true,
      method: 'totp',
    });
    expect(response.body).toHaveProperty('mfaToken');
    expect(response.body.user.email).toBe(mfaEmail);
    expect(response.body).not.toHaveProperty('token');
  });

  it('completes MFA login with code payload', async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/v2/auth/login')
      .send({
        email: mfaEmail,
        password: mfaPassword,
      })
      .expect(200);

    const code = generateTotpCodeForTest(mfaSecret);

    const response = await agent
      .post('/api/v2/auth/login/2fa')
      .send({
        email: mfaEmail,
        mfaToken: loginResponse.body.mfaToken,
        code,
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('csrfToken');
    expect(response.body.organizationId).toBe(expectedOrganizationId);
    expect(response.body.user.email).toBe(mfaEmail);
    const decoded = jwt.verify(response.body.token, getJwtSecret()) as {
      organizationId?: string;
    };
    expect(decoded.organizationId).toBe(expectedOrganizationId);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^auth_token=/),
      ])
    );
    expect(response.headers['set-cookie']).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^refresh_token=/)])
    );

    await agent
      .post('/api/v2/auth/logout')
      .set('X-CSRF-Token', response.body.csrfToken)
      .expect(200);
  });

  it('accepts legacy token payload for MFA code', async () => {
    const loginResponse = await request(app)
      .post('/api/v2/auth/login')
      .send({
        email: mfaEmail,
        password: mfaPassword,
      })
      .expect(200);

    const legacyCode = generateTotpCodeForTest(mfaSecret);

    const response = await request(app)
      .post('/api/v2/auth/login/2fa')
      .send({
        email: mfaEmail,
        mfaToken: loginResponse.body.mfaToken,
        token: legacyCode,
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('csrfToken');
    expect(response.body.user.email).toBe(mfaEmail);
  });
});
