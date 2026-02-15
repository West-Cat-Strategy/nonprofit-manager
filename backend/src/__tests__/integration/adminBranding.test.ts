import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Admin Branding API', () => {
  let adminToken = '';
  let userToken = '';
  let adminEmail = '';
  let userEmail = '';
  let originalConfig: unknown = null;

  const password = 'Test123!Strong';

  beforeAll(async () => {
    // Ensure table exists (keeps the test self-contained even if migrations haven't been applied locally).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_branding (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      "INSERT INTO organization_branding (id, config) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING"
    );

    // Snapshot current branding so we can restore it after the test.
    const snapshot = await pool.query('SELECT config FROM organization_branding WHERE id = 1');
    originalConfig = snapshot.rows[0]?.config ?? {};

    // Create admin user (register -> promote -> login to get admin role in JWT)
    adminEmail = `branding-admin-${Date.now()}@example.com`;
    const adminRegister = await request(app).post('/api/auth/register').send({
      email: adminEmail,
      password,
      password_confirm: password,
      first_name: 'Branding',
      last_name: 'Admin',
    });
    const adminUserId = adminRegister.body?.user?.user_id;
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [adminUserId]);

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: adminEmail,
      password,
    });
    adminToken = adminLogin.body?.token;

    // Create regular user
    userEmail = `branding-user-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({
      email: userEmail,
      password,
      password_confirm: password,
      first_name: 'Branding',
      last_name: 'User',
    });
    const userLogin = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password,
    });
    userToken = userLogin.body?.token;
  });

  afterAll(async () => {
    // Restore branding row to avoid bleeding state into other test files/environments.
    try {
      await pool.query(
        `INSERT INTO organization_branding (id, config, created_at, updated_at)
         VALUES (1, $1::jsonb, NOW(), NOW())
         ON CONFLICT (id)
         DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
        [JSON.stringify(originalConfig ?? {})]
      );
    } catch {
      // ignore
    }

    // Clean up users
    try {
      if (adminEmail) await pool.query('DELETE FROM users WHERE email = $1', [adminEmail]);
      if (userEmail) await pool.query('DELETE FROM users WHERE email = $1', [userEmail]);
    } catch {
      // ignore
    }
  });

  it('allows authenticated users to read branding', async () => {
    const response = await request(app)
      .get('/api/admin/branding')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('object');
  });

  it('rejects non-admin updates', async () => {
    const response = await request(app)
      .put('/api/admin/branding')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        appName: 'Should Not Save',
        appIcon: null,
        primaryColour: '#000000',
        secondaryColour: '#ffffff',
        favicon: null,
      });

    expect(response.status).toBe(403);
  });

  it('allows admin to update branding and returns persisted config', async () => {
    const payload = {
      appName: `My Branded App ${Date.now()}`,
      appIcon: null,
      primaryColour: '#123456',
      secondaryColour: '#abcdef',
      favicon: null,
    };

    const putResponse = await request(app)
      .put('/api/admin/branding')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(putResponse.status).toBe(200);
    expect(putResponse.body.appName).toBe(payload.appName);
    expect(putResponse.body.primaryColour).toBe(payload.primaryColour);

    const getResponse = await request(app)
      .get('/api/admin/branding')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.appName).toBe(payload.appName);
    expect(getResponse.body.secondaryColour).toBe(payload.secondaryColour);
  });
});
