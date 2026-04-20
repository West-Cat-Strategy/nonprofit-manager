import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

import { randomUUID } from 'crypto';

let authToken = '';
const TEST_USER_ID = randomUUID();

describe('Alerts API Integration', () => {
  beforeAll(async () => {
    const email = 'alerts-integration@example.com';
    
    // Create user in DB to satisfy session validation
    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO UPDATE SET is_active = true`,
      [TEST_USER_ID, email, 'hash', 'Alerts', 'Integration', 'user']
    );

    authToken = jwt.sign(
      {
        id: TEST_USER_ID,
        email: email,
        role: 'user',
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
  });
  it('rejects unauthenticated access', async () => {
    await request(app).get('/api/v2/alerts/configs').expect(401);
  });

  it('rejects unauthenticated alert creation', async () => {
    await request(app)
      .post('/api/v2/alerts/configs')
      .send({ name: 'A', metric_type: 'donations', condition: 'exceeds', frequency: 'daily', channels: ['email'], severity: 'low' })
      .expect(401);
  });

  it('validates alert config payload for authenticated requests', async () => {
    const response = await request(app)
      .post('/api/v2/alerts/configs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        metric_type: 'donations',
        condition: 'exceeds',
        frequency: 'daily',
        channels: ['email'],
        severity: 'low',
      })
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error.code', 'validation_error');
  });

  it('validates alert instance query bounds for authenticated requests', async () => {
    const response = await request(app)
      .get('/api/v2/alerts/instances?limit=500')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error.code', 'validation_error');
  });
});
