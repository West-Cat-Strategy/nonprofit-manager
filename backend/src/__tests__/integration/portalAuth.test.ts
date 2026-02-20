import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Portal Auth API Integration', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  it('validates portal signup payload', async () => {
    await request(app)
      .post('/api/portal/auth/signup')
      .send({
        email: 'not-an-email',
        password: 'weak',
        firstName: '',
        lastName: '',
      })
      .expect(400);
  });

  it('requires portal auth for /me', async () => {
    await request(app).get('/api/portal/auth/me').expect(401);
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
        .get('/api/portal/auth/me')
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
});
