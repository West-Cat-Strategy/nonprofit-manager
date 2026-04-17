import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../index';
import { getJwtSecret } from '../../config/jwt';
import pool from '../../config/database';

describe('Grants API Integration', () => {
  let authToken = '';
  let adminUserId = '';
  let organizationId = '';

  beforeAll(async () => {
    const adminEmail = `grants-admin-${Date.now()}@example.com`;
    const adminUser = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Grants', 'Admin', 'admin', NOW(), NOW())
       RETURNING id`,
      [adminEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );

    adminUserId = adminUser.rows[0]?.id ?? '';
    authToken = jwt.sign(
      {
        id: adminUserId,
        email: adminEmail,
        role: 'admin',
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    const organization = await pool.query<{ id: string }>(
      `INSERT INTO accounts (account_name, account_type, created_at, updated_at)
       VALUES ($1, 'organization', NOW(), NOW())
       RETURNING id`,
      [`Grants Integration Test Org ${Date.now()}`]
    );

    organizationId = organization.rows[0]?.id ?? '';
  });

  it('rejects unauthenticated summary requests', async () => {
    await request(app).get('/api/v2/grants/summary').expect(401);
  });

  it('validates the grants summary query before hitting the service layer', async () => {
    await request(app)
      .get('/api/v2/grants/summary?jurisdiction=not-a-jurisdiction')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(400);
  });

  it('returns an authenticated grants summary response', async () => {
    const response = await request(app)
      .get('/api/v2/grants/summary')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          total_funders: expect.any(Number),
          total_awards: expect.any(Number),
          by_status: expect.any(Array),
          recent_activity: expect.any(Array),
          upcoming_items: expect.any(Array),
        }),
      })
    );
  });

  afterAll(async () => {
    if (organizationId) {
      await pool.query('DELETE FROM accounts WHERE id = $1', [organizationId]);
    }
    if (adminUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    }
  });
});
