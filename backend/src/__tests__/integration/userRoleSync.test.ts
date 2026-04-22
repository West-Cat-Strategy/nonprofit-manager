import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('User Role Sync Integration', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const testPassword = 'Test123!Strong';

  const createAdminUser = async (email: string): Promise<string> => {
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const result = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Role', 'Sync', 'admin', NOW(), NOW())
       RETURNING id`,
      [email, passwordHash]
    );
    return result.rows[0].id;
  };

  const safeDelete = async (query: string, params: unknown[]) => {
    try {
      await pool.query(query, params);
    } catch {
      // Optional tables or FK chains can vary across local test states.
    }
  };

  const clearRoleSyncFailureTrigger = async () => {
    await safeDelete('DROP TRIGGER IF EXISTS simulate_user_role_sync_failure ON user_roles', []);
    await safeDelete('DROP FUNCTION IF EXISTS simulate_user_role_sync_failure()', []);
  };

  const installRoleSyncFailureTrigger = async (userId: string) => {
    await clearRoleSyncFailureTrigger();
    await pool.query(`
      CREATE FUNCTION simulate_user_role_sync_failure()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'simulated user role sync failure';
      END;
      $$;
    `);
    await pool.query(`
      CREATE TRIGGER simulate_user_role_sync_failure
      BEFORE DELETE ON user_roles
      FOR EACH ROW
      WHEN (OLD.user_id = '${userId}'::uuid)
      EXECUTE FUNCTION simulate_user_role_sync_failure()
    `);
  };

  afterAll(async () => {
    await clearRoleSyncFailureTrigger();
    const users = await pool.query(
      "SELECT id FROM users WHERE email LIKE 'role-sync-%@example.com'"
    );
    const userIds = users.rows.map((row: { id: string }) => row.id);

    if (userIds.length > 0) {
      await safeDelete('DELETE FROM user_roles WHERE user_id = ANY($1)', [userIds]);
      await safeDelete('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    }
  });

  it('persists role assignment in user_roles during login role sync', async () => {
    const email = `role-sync-success-${unique()}@example.com`;
    const userId = await createAdminUser(email);

    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

    const response = await request(app)
      .post('/api/v2/auth/login')
      .send({
        email,
        password: testPassword,
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');

    const roleResult = await pool.query<{ id: string }>('SELECT id FROM roles WHERE name = $1', ['admin']);
    expect(roleResult.rows.length).toBeGreaterThan(0);

    const userRoleResult = await pool.query<{ role_id: string }>(
      'SELECT role_id FROM user_roles WHERE user_id = $1',
      [userId]
    );
    expect(userRoleResult.rows.length).toBeGreaterThan(0);
    expect(userRoleResult.rows[0].role_id).toBe(roleResult.rows[0].id);
  });

  it('fails closed when user_roles sync raises a database error', async () => {
    const email = `role-sync-fail-${unique()}@example.com`;
    const userId = await createAdminUser(email);
    const alternateRoleResult = await pool.query<{ id: string }>(
      'SELECT id FROM roles WHERE name <> $1 ORDER BY priority DESC, name ASC LIMIT 1',
      ['admin']
    );
    expect(alternateRoleResult.rows.length).toBeGreaterThan(0);

    await pool.query(
      `INSERT INTO user_roles (user_id, role_id, assignment_source)
       VALUES ($1, $2, 'primary')
       ON CONFLICT (user_id, role_id)
       DO UPDATE SET assignment_source = 'primary'`,
      [userId, alternateRoleResult.rows[0].id]
    );

    await installRoleSyncFailureTrigger(userId);

    try {
      const response = await request(app).post('/api/v2/auth/login').send({
        email,
        password: testPassword,
      });

      expect(response.status).toBe(500);
      expect(response.body?.success).toBe(false);
      expect(response.body?.error).toBeTruthy();
    } finally {
      await clearRoleSyncFailureTrigger();
    }
  });
});
