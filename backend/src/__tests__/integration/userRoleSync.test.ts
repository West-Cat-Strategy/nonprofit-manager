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

  afterAll(async () => {
    try {
      const users = await pool.query(
        "SELECT id FROM users WHERE email LIKE 'role-sync-%@example.com'"
      );
      const userIds = users.rows.map((row: { id: string }) => row.id);

      if (userIds.length > 0) {
        await safeDelete('DELETE FROM user_roles WHERE user_id = ANY($1)', [userIds]);
        await safeDelete('DELETE FROM users WHERE id = ANY($1)', [userIds]);
      }
    } finally {
      await pool.end();
    }
  });

  it('persists role assignment in user_roles during login role sync', async () => {
    const email = `role-sync-success-${unique()}@example.com`;
    const userId = await createAdminUser(email);

    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

    const response = await request(app)
      .post('/api/auth/login')
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
    await createAdminUser(email);
    const originalQuery = pool.query.bind(pool);

    const querySpy = jest.spyOn(pool as any, 'query').mockImplementation((...args: any[]) => {
      const queryText = args[0];
      if (typeof queryText === 'string' && queryText.includes('DELETE FROM user_roles')) {
        return Promise.reject(new Error('simulated user role sync failure'));
      }
      return originalQuery(...args);
    });

    try {
      const response = await request(app).post('/api/auth/login').send({
        email,
        password: testPassword,
      });

      expect(response.status).toBe(500);
      expect(response.body?.error?.code).toBe('server_error');
    } finally {
      querySpy.mockRestore();
    }
  });
});
