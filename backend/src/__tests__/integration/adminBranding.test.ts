import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Admin Branding API', () => {
  let adminToken = '';
  let userToken = '';
  let adminEmail = '';
  let userEmail = '';
  let adminOrgId = '';
  let userOrgId = '';
  const originalConfigs = new Map<string, unknown>();

  const password = 'Test123!Strong';

  const resolveOrganizationIdForEmail = async (email: string): Promise<string> => {
    const result = await pool.query<{ account_id: string }>(
      `SELECT uaa.account_id::text
       FROM user_account_access uaa
       INNER JOIN users u ON u.id = uaa.user_id
       WHERE u.email = $1
         AND uaa.is_active = true
       ORDER BY uaa.granted_at ASC
       LIMIT 1`,
      [email]
    );
    const organizationId = result.rows[0]?.account_id;
    if (!organizationId) {
      throw new Error(`No active organization access for ${email}`);
    }
    return organizationId;
  };

  beforeAll(async () => {
    // Ensure table exists (keeps the test self-contained even if migrations haven't been applied locally).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_branding (
        organization_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Create admin user (register -> promote -> login to get admin role in JWT)
    adminEmail = `branding-admin-${Date.now()}@example.com`;
    const adminRegister = await request(app).post('/api/v2/auth/register').send({
      email: adminEmail,
      password,
      password_confirm: password,
      first_name: 'Branding',
      last_name: 'Admin',
    });
    const adminUserId = adminRegister.body?.user?.user_id;
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [adminUserId]);

    const adminLogin = await request(app).post('/api/v2/auth/login').send({
      email: adminEmail,
      password,
    });
    adminToken = adminLogin.body?.token;
    adminOrgId =
      adminLogin.body?.organizationId || (await resolveOrganizationIdForEmail(adminEmail));

    // Create regular user
    userEmail = `branding-user-${Date.now()}@example.com`;
    await request(app).post('/api/v2/auth/register').send({
      email: userEmail,
      password,
      password_confirm: password,
      first_name: 'Branding',
      last_name: 'User',
    });
    const userLogin = await request(app).post('/api/v2/auth/login').send({
      email: userEmail,
      password,
    });
    userToken = userLogin.body?.token;
    userOrgId = userLogin.body?.organizationId || (await resolveOrganizationIdForEmail(userEmail));

    for (const organizationId of Array.from(new Set([adminOrgId, userOrgId]))) {
      const snapshot = await pool.query(
        'SELECT config FROM organization_branding WHERE organization_id = $1',
        [organizationId]
      );
      originalConfigs.set(organizationId, snapshot.rows[0]?.config ?? {});
      await pool.query(
        `INSERT INTO organization_branding (organization_id, config)
         VALUES ($1, '{}'::jsonb)
         ON CONFLICT (organization_id) DO NOTHING`,
        [organizationId]
      );
    }
  });

  afterAll(async () => {
    // Restore branding row to avoid bleeding state into other test files/environments.
    try {
      for (const [organizationId, config] of originalConfigs.entries()) {
        await pool.query(
          `INSERT INTO organization_branding (organization_id, config, created_at, updated_at)
           VALUES ($1, $2::jsonb, NOW(), NOW())
           ON CONFLICT (organization_id)
           DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
          [organizationId, JSON.stringify(config ?? {})]
        );
      }
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
      .get('/api/v2/admin/branding')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.any(Object),
      })
    );
  });

  it('rejects non-admin updates', async () => {
    const response = await request(app)
      .put('/api/v2/admin/branding')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        appName: 'Should Not Save',
        appIcon: null,
        primaryColour: '#000000',
        secondaryColour: '#ffffff',
        favicon: null,
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'forbidden',
        }),
      })
    );
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
      .put('/api/v2/admin/branding')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(putResponse.status).toBe(200);
    expect(putResponse.body.success).toBe(true);
    expect(putResponse.body.data).toEqual(expect.objectContaining(payload));
    expect(putResponse.body.appName).toBe(payload.appName);
    expect(putResponse.body.primaryColour).toBe(payload.primaryColour);

    const getResponse = await request(app)
      .get('/api/v2/admin/branding')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data).toEqual(expect.objectContaining(payload));
    expect(getResponse.body.appName).toBe(payload.appName);
    expect(getResponse.body.secondaryColour).toBe(payload.secondaryColour);
  });
});
