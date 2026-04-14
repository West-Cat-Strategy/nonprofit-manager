import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../index';
import { getJwtSecret } from '../../config/jwt';
import pool from '../../config/database';

describe('Grants API Integration', () => {
  const authToken = jwt.sign(
    {
      id: 'user-1',
      email: 'grants-admin@example.com',
      role: 'admin',
    },
    getJwtSecret(),
    { expiresIn: '1h' }
  );
  let organizationId = '';

  beforeAll(async () => {
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

  afterAll(async () => {
    if (organizationId) {
      await pool.query('DELETE FROM accounts WHERE id = $1', [organizationId]);
    }
  });
});
