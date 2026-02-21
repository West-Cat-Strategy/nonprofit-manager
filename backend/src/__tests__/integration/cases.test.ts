import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Case API Integration Tests', () => {
  let authToken: string;
  let testEmail: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  beforeAll(async () => {
    testEmail = `cases-test-${unique()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Case',
        last_name: 'Tester',
      });

    authToken = registerResponse.body.token;
  });

  afterAll(async () => {
    if (testEmail) {
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail.toLowerCase()]);
    }
    await pool.end();
  });

  it('requires auth for v1 list endpoint', async () => {
    await request(app).get('/api/cases').expect(401);
  });

  it('requires auth for v2 list endpoint', async () => {
    await request(app).get('/api/v2/cases').expect(401);
  });

  it('serves v1 list with deprecation headers', async () => {
    const response = await request(app)
      .get('/api/cases')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.headers.deprecation).toBe('true');
    expect(response.headers.sunset).toBeDefined();
    expect(response.headers.link).toContain('/api/v2/cases');
    expect(response.body).toHaveProperty('cases');
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

  it('serves both v1 and v2 metadata endpoints', async () => {
    const v1Types = await request(app)
      .get('/api/cases/types')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const v2Types = await request(app)
      .get('/api/v2/cases/types')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(v1Types.body).toHaveProperty('types');
    expect(v2Types.body).toHaveProperty('success', true);
    expect(Array.isArray(v2Types.body.data)).toBe(true);
  });
});
