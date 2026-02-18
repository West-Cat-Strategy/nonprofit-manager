import request from 'supertest';
import bcrypt from 'bcryptjs';
import { authenticator } from '@otplib/preset-default';
import app from '../../index';
import pool from '../../config/database';
import { encrypt } from '../../utils/encryption';

describe('Auth MFA Integration Tests', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const mfaEmail = `auth-mfa-${unique()}@example.com`;
  const mfaPassword = 'StrongPassword123!';
  const mfaSecret = authenticator.generateSecret();

  beforeAll(async () => {
    authenticator.options = { step: 30, window: 1 };
    const passwordHash = await bcrypt.hash(mfaPassword, 10);

    await pool.query(
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
      VALUES ($1, $2, 'Mfa', 'User', 'user', TRUE, $3, NOW(), NOW())`,
      [mfaEmail, passwordHash, encrypt(mfaSecret)]
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
    await safeDelete('DELETE FROM audit_logs WHERE user_id = ANY($1)', [userIds]);
    await safeDelete('DELETE FROM users WHERE id = ANY($1)', [userIds]);
  });

  it('requires MFA on password login for TOTP-enabled users', async () => {
    const response = await request(app)
      .post('/api/auth/login')
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
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: mfaEmail,
        password: mfaPassword,
      })
      .expect(200);

    const code = authenticator.generate(mfaSecret);

    const response = await request(app)
      .post('/api/auth/login/2fa')
      .send({
        email: mfaEmail,
        mfaToken: loginResponse.body.mfaToken,
        code,
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user.email).toBe(mfaEmail);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^auth_token=/),
        expect.stringMatching(/^refresh_token=/),
      ])
    );
  });

  it('accepts legacy token payload for MFA code', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: mfaEmail,
        password: mfaPassword,
      })
      .expect(200);

    const legacyCode = authenticator.generate(mfaSecret);

    const response = await request(app)
      .post('/api/auth/login/2fa')
      .send({
        email: mfaEmail,
        mfaToken: loginResponse.body.mfaToken,
        token: legacyCode,
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(mfaEmail);
  });
});
