import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';
import { MAX_LOGIN_ATTEMPTS } from '../../middleware/accountLockout';

describe('Portal Auth API Integration', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  it('validates portal signup payload', async () => {
    await request(app)
      .post('/api/v2/portal/auth/signup')
      .send({
        email: 'not-an-email',
        password: 'weak',
        firstName: '',
        lastName: '',
      })
      .expect(400);
  });

  it('stores duplicate-email signup requests without binding the wrong contact', async () => {
    const suffix = unique();
    const email = `portal-duplicate-${suffix}@example.com`;
    const createdContactIds: string[] = [];
    let signupRequestId: string | null = null;

    try {
      const firstContact = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, phone, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $5, $5)
         RETURNING id`,
        ['Existing', 'One', email, '555-0001', null]
      );
      createdContactIds.push(firstContact.rows[0].id);

      const secondContact = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, phone, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $5, $5)
         RETURNING id`,
        ['Existing', 'Two', email, '555-0002', null]
      );
      createdContactIds.push(secondContact.rows[0].id);

      const response = await request(app)
        .post('/api/v2/portal/auth/signup')
        .send({
          email: email.toUpperCase(),
          password: 'Portal1Password',
          firstName: 'Signup',
          lastName: 'Person',
          phone: '555-555-1212',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'pending',
          requestId: expect.any(String),
          message: 'Signup request submitted. A staff member must approve your access.',
        },
      });
      signupRequestId = response.body.data.requestId as string;

      const signupRequest = await pool.query<{
        id: string;
        contact_id: string | null;
        resolution_status: string;
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
      }>(
        `SELECT id, contact_id, resolution_status, first_name, last_name, phone
         FROM portal_signup_requests
         WHERE id = $1`,
        [signupRequestId]
      );

      expect(signupRequest.rows[0]).toMatchObject({
        id: signupRequestId,
        contact_id: null,
        resolution_status: 'needs_contact_resolution',
        first_name: 'Signup',
        last_name: 'Person',
        phone: '555-555-1212',
      });
    } finally {
      if (signupRequestId) {
        await pool.query('DELETE FROM portal_signup_requests WHERE id = $1', [signupRequestId]);
      }
      for (const contactId of createdContactIds) {
        try {
          await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);
        } catch {
          // Ignore cleanup errors in integration tests.
        }
      }
    }
  });

  it('requires portal auth for /me', async () => {
    await request(app).get('/api/v2/portal/auth/me').expect(401);
  });

  it('requires portal auth for /bootstrap', async () => {
    await request(app).get('/api/v2/portal/auth/bootstrap').expect(401);
  });

  it('supports the portal forgot-password and reset-password flow', async () => {
    const suffix = unique();
    let portalUserId: string | null = null;
    let contactId: string | null = null;
    const email = `portal-reset-${suffix}@example.com`;
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);

    try {
      const contactResult = await pool.query(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id`,
        ['Portal', 'ResetTest', email, null]
      );
      contactId = contactResult.rows[0].id as string;

      const portalUserResult = await pool.query(
        `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [contactId, email, passwordHash, 'active', true]
      );
      portalUserId = portalUserResult.rows[0].id as string;

      const forgotResponse = await request(app)
        .post('/api/v2/portal/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(forgotResponse.body).toMatchObject({
        success: true,
        data: {
          message:
            'If an account with that email exists, a portal password reset link has been sent.',
        },
      });

      const tokenResult = await pool.query<{ id: string }>(
        `SELECT id
         FROM portal_password_reset_tokens
         WHERE portal_user_id = $1 AND used_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [portalUserId]
      );
      const tokenId = tokenResult.rows[0]?.id;
      expect(tokenId).toBeTruthy();

      const storedTokenResult = await pool.query<{ token_hash: string }>(
        `SELECT token_hash
         FROM portal_password_reset_tokens
         WHERE id = $1`,
        [tokenId]
      );
      const storedHash = storedTokenResult.rows[0]?.token_hash;
      expect(storedHash).toBeTruthy();

      // The controller emits composite tokens, so validate/reset by reading the generated URL token
      // format back from the hash row through a real request path is not possible. Seed a valid token
      // directly in the same format used by the service.
      const tokenSecret = 'a'.repeat(64);
      const reseededHash = await bcrypt.hash(tokenSecret, 10);
      await pool.query(
        `UPDATE portal_password_reset_tokens
         SET token_hash = $1
         WHERE id = $2`,
        [reseededHash, tokenId]
      );
      const compositeToken = `${tokenId}.${tokenSecret}`;

      const validateResponse = await request(app)
        .get(`/api/v2/portal/auth/reset-password/${compositeToken}`)
        .expect(200);

      expect(validateResponse.body).toMatchObject({
        success: true,
        data: { valid: true },
      });

      const resetResponse = await request(app)
        .post('/api/v2/portal/auth/reset-password')
        .send({
          token: compositeToken,
          password: 'NewPortalPassword123!',
          password_confirm: 'NewPortalPassword123!',
        })
        .expect(200);

      expect(resetResponse.body).toMatchObject({
        success: true,
        data: {
          message:
            'Portal password has been reset successfully. You can now sign in with your new password.',
        },
      });

      await request(app)
        .post('/api/v2/portal/auth/login')
        .send({
          email,
          password: 'NewPortalPassword123!',
        })
        .expect(200);
    } finally {
      if (portalUserId) {
        await pool.query('DELETE FROM portal_password_reset_tokens WHERE portal_user_id = $1', [
          portalUserId,
        ]);
      }
      try {
        if (portalUserId) {
          await pool.query('DELETE FROM portal_users WHERE id = $1', [portalUserId]);
        }
      } catch {
        // Ignore cleanup errors in integration tests.
      }
      if (contactId) {
        try {
          await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);
        } catch {
          // Ignore cleanup errors in integration tests.
        }
      }
    }
  });

  it('accepts portal auth token from cookie for /me', async () => {
    const suffix = unique();
    let portalUserId: string | null = null;
    let contactId: string | null = null;
    const email = `portal-cookie-${suffix}@example.com`;

    try {
      const contactResult = await pool.query(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id`,
        ['Portal', 'CookieTest', email, null]
      );
      contactId = contactResult.rows[0].id as string;

      const portalUserResult = await pool.query(
        `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [contactId, email, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG', 'active', true]
      );
      portalUserId = portalUserResult.rows[0].id as string;

      const token = jwt.sign(
        { id: portalUserId, email, contactId, type: 'portal' as const },
        getJwtSecret(),
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v2/portal/auth/me')
        .set('Cookie', [`portal_auth_token=${token}`])
        .expect(200);

      expect(response.body.id).toBe(portalUserId);
      expect(response.body.email).toBe(email);
      expect(response.body.contact_id).toBe(contactId);
    } finally {
      try {
        if (portalUserId) {
          await pool.query('DELETE FROM portal_users WHERE id = $1', [portalUserId]);
        }
      } catch {
        // Ignore cleanup errors in integration tests.
      }
      if (contactId) {
        try {
          await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);
        } catch {
          // Ignore cleanup errors in integration tests.
        }
      }
    }
  });

  it('accepts portal auth token from cookie for /bootstrap', async () => {
    const suffix = unique();
    let portalUserId: string | null = null;
    let contactId: string | null = null;
    const email = `portal-bootstrap-${suffix}@example.com`;

    try {
      const contactResult = await pool.query(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id`,
        ['Portal', 'BootstrapTest', email, null]
      );
      contactId = contactResult.rows[0].id as string;

      const portalUserResult = await pool.query(
        `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [contactId, email, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG', 'active', true]
      );
      portalUserId = portalUserResult.rows[0].id as string;

      const token = jwt.sign(
        { id: portalUserId, email, contactId, type: 'portal' as const },
        getJwtSecret(),
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v2/portal/auth/bootstrap')
        .set('Cookie', [`portal_auth_token=${token}`])
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: portalUserId,
            email,
            contactId,
          },
        },
      });
    } finally {
      try {
        if (portalUserId) {
          await pool.query('DELETE FROM portal_users WHERE id = $1', [portalUserId]);
        }
      } catch {
        // Ignore cleanup errors in integration tests.
      }
      if (contactId) {
        try {
          await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);
        } catch {
          // Ignore cleanup errors in integration tests.
        }
      }
    }
  });

  it('rejects portal sessions immediately after the user is suspended', async () => {
    const suffix = unique();
    let portalUserId: string | null = null;
    let contactId: string | null = null;
    const email = `portal-suspended-${suffix}@example.com`;

    try {
      const contactResult = await pool.query(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id`,
        ['Portal', 'SuspendTest', email, null]
      );
      contactId = contactResult.rows[0].id as string;

      const portalUserResult = await pool.query(
        `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [contactId, email, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG', 'active', true]
      );
      portalUserId = portalUserResult.rows[0].id as string;

      const token = jwt.sign(
        { id: portalUserId, email, contactId, type: 'portal' as const },
        getJwtSecret(),
        { expiresIn: '1h' }
      );

      await pool.query('UPDATE portal_users SET status = $1 WHERE id = $2', ['suspended', portalUserId]);

      const response = await request(app)
        .get('/api/v2/portal/auth/me')
        .set('Cookie', [`portal_auth_token=${token}`])
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'unauthorized',
          message: 'Invalid or expired token',
        },
      });
    } finally {
      try {
        if (portalUserId) {
          await pool.query('DELETE FROM portal_users WHERE id = $1', [portalUserId]);
        }
      } catch {
        // Ignore cleanup errors in integration tests.
      }
      if (contactId) {
        try {
          await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);
        } catch {
          // Ignore cleanup errors in integration tests.
        }
      }
    }
  });

  it('locks portal login after repeated failed attempts', async () => {
    const previousLockoutFlag = process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST;
    process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = 'true';

    const suffix = unique();
    let portalUserId: string | null = null;
    let contactId: string | null = null;
    const email = `portal-lockout-${suffix}@example.com`;
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);

    try {
      const contactResult = await pool.query(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id`,
        ['Portal', 'LockoutTest', email, null]
      );
      contactId = contactResult.rows[0].id as string;

      const portalUserResult = await pool.query(
        `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [contactId, email, passwordHash, 'active', true]
      );
      portalUserId = portalUserResult.rows[0].id as string;

      for (let attempt = 0; attempt < MAX_LOGIN_ATTEMPTS; attempt += 1) {
        await request(app)
          .post('/api/v2/portal/auth/login')
          .send({
            email,
            password: 'WrongPassword123!',
          })
          .expect(401);
      }

      const response = await request(app)
        .post('/api/v2/portal/auth/login')
        .send({
          email,
          password: 'WrongPassword123!',
        })
        .expect(423);

      expect(response.body.error.code).toBe('account_locked');
    } finally {
      process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = previousLockoutFlag;
      try {
        if (portalUserId) {
          await pool.query('DELETE FROM portal_users WHERE id = $1', [portalUserId]);
        }
      } catch {
        // Ignore cleanup errors in integration tests.
      }
      if (contactId) {
        try {
          await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);
        } catch {
          // Ignore cleanup errors in integration tests.
        }
      }
    }
  });
});
