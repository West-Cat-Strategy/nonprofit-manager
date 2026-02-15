import request from 'supertest';
import * as zlib from 'zlib';
import app from '../../index';
import pool from '../../config/database';

function parseBinaryResponse(res: any, callback: any) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('Backup Export API', () => {
  let adminToken = '';
  let userToken = '';
  let adminEmail = '';
  let userEmail = '';

  const password = 'Test123!Strong';

  beforeAll(async () => {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Keep test self-contained even if migrations haven't been applied.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS backup_test_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `INSERT INTO backup_test_items (name) VALUES ($1)`,
      [`item-${Date.now()}`]
    );

    // Create admin user (register -> promote -> login to get admin role in JWT)
    adminEmail = `backup-admin-${Date.now()}@example.com`;
    const adminRegister = await request(app).post('/api/auth/register').send({
      email: adminEmail,
      password,
      password_confirm: password,
      first_name: 'Backup',
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
    userEmail = `backup-user-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({
      email: userEmail,
      password,
      password_confirm: password,
      first_name: 'Backup',
      last_name: 'User',
    });
    const userLogin = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password,
    });
    userToken = userLogin.body?.token;
  });

  afterAll(async () => {
    try {
      if (adminEmail) await pool.query('DELETE FROM users WHERE email = $1', [adminEmail]);
      if (userEmail) await pool.query('DELETE FROM users WHERE email = $1', [userEmail]);
    } catch {
      // ignore
    }

    try {
      await pool.query('DROP TABLE IF EXISTS backup_test_items');
    } catch {
      // ignore
    }
  });

  it('rejects non-admin export', async () => {
    const response = await request(app)
      .post('/api/backup/export')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ include_secrets: false });

    expect(response.status).toBe(403);
  });

  it('exports a redacted backup by default', async () => {
    const response = await request(app)
      .post('/api/backup/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ include_secrets: false, compress: true })
      .buffer(true)
      .parse(parseBinaryResponse);

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('.json.gz');

    const json = JSON.parse(zlib.gunzipSync(response.body).toString('utf8'));

    expect(json?.meta?.include_secrets).toBe(false);
    expect(json?.tables?.users).toBeDefined();
    expect(json?.tables?.backup_test_items).toBeDefined();

    const usersRows = json.tables.users.rows as any[];
    const adminRow = usersRows.find((r) => r.email === adminEmail);
    expect(adminRow).toBeDefined();
    expect(adminRow.password_hash).toBeNull();
  });

  it('can export an unredacted (full) backup', async () => {
    const response = await request(app)
      .post('/api/backup/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ include_secrets: true, compress: true })
      .buffer(true)
      .parse(parseBinaryResponse);

    expect(response.status).toBe(200);

    const json = JSON.parse(zlib.gunzipSync(response.body).toString('utf8'));
    expect(json?.meta?.include_secrets).toBe(true);

    const usersRows = json.tables.users.rows as any[];
    const adminRow = usersRows.find((r) => r.email === adminEmail);
    expect(adminRow).toBeDefined();
    expect(typeof adminRow.password_hash).toBe('string');
    expect(adminRow.password_hash.length).toBeGreaterThan(0);
  });
});

