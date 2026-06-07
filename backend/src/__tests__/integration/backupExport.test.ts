import request, { type Test } from 'supertest';
import * as zlib from 'zlib';
import app from '../../index';
import pool from '../../config/database';
import {
  createIntegrationAuthContext,
  deleteIntegrationAuthFixtures,
} from './helpers/authFixtures';

jest.setTimeout(120000);

function parseBinaryResponse(res: any, callback: any) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('Backup Export API', () => {
  let adminToken = '';
  let userToken = '';
  let adminEmail = '';
  let adminUserId = '';
  let userId = '';
  let adminOrganizationId = '';
  let userOrganizationId = '';
  let previousExcludedTables: string | undefined;
  let previousSecretExportEnabled: string | undefined;

  const withAdminAuth = (req: Test): Test =>
    req
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', adminOrganizationId);

  const withUserAuth = (req: Test): Test =>
    req
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-Organization-Id', userOrganizationId);

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

    // Keep this integration test bounded even if the shared test DB contains large tables.
    previousExcludedTables = process.env.BACKUP_EXCLUDED_TABLES;
    previousSecretExportEnabled = process.env.BACKUP_INCLUDE_SECRETS_ENABLED;
    const allTables = await pool.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `);
    const allowedTables = new Set(['users', 'backup_test_items']);
    const excludedTables = allTables.rows
      .map((row) => row.table_name)
      .filter((tableName) => !allowedTables.has(tableName));
    process.env.BACKUP_EXCLUDED_TABLES = excludedTables.join(',');

    const adminContext = await createIntegrationAuthContext({
      emailPrefix: 'backup-admin',
      accountName: `Backup Admin Org ${Date.now()}`,
      role: 'admin',
    });
    adminEmail = adminContext.email;
    adminUserId = adminContext.userId;
    adminOrganizationId = adminContext.organizationId;
    adminToken = adminContext.authToken;

    const userContext = await createIntegrationAuthContext({
      emailPrefix: 'backup-user',
      accountName: `Backup User Org ${Date.now()}`,
      role: 'user',
    });
    userId = userContext.userId;
    userOrganizationId = userContext.organizationId;
    userToken = userContext.authToken;
  });

  afterAll(async () => {
    try {
      await deleteIntegrationAuthFixtures({
        userIds: [adminUserId, userId].filter(Boolean),
        organizationIds: [adminOrganizationId, userOrganizationId].filter(Boolean),
      });
    } catch {
      // ignore
    }

    try {
      await pool.query('DROP TABLE IF EXISTS backup_test_items');
    } catch {
      // ignore
    }

    if (previousExcludedTables === undefined) {
      delete process.env.BACKUP_EXCLUDED_TABLES;
    } else {
      process.env.BACKUP_EXCLUDED_TABLES = previousExcludedTables;
    }

    if (previousSecretExportEnabled === undefined) {
      delete process.env.BACKUP_INCLUDE_SECRETS_ENABLED;
    } else {
      process.env.BACKUP_INCLUDE_SECRETS_ENABLED = previousSecretExportEnabled;
    }
  });

  it('rejects non-admin export', async () => {
    const response = await withUserAuth(request(app).post('/api/v2/backup/export'))
      .send({ include_secrets: false });

    expect(response.status).toBe(403);
  });

  it('exports a redacted backup by default', async () => {
    const response = await withAdminAuth(request(app).post('/api/v2/backup/export'))
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

  it('rejects secret-bearing exports unless the environment gate and confirmation are both present', async () => {
    delete process.env.BACKUP_INCLUDE_SECRETS_ENABLED;

    await withAdminAuth(request(app).post('/api/v2/backup/export'))
      .send({ include_secrets: true, confirm_secrets_export: 'EXPORT_UNREDACTED_BACKUP' })
      .expect(403);

    process.env.BACKUP_INCLUDE_SECRETS_ENABLED = 'true';

    const response = await withAdminAuth(request(app).post('/api/v2/backup/export'))
      .send({ include_secrets: true, confirm_secrets_export: 'export_unredacted_backup' });

    expect(response.status).toBe(400);
  });

  it('can export an unredacted (full) backup when explicitly gated and confirmed', async () => {
    process.env.BACKUP_INCLUDE_SECRETS_ENABLED = 'true';

    const response = await withAdminAuth(request(app).post('/api/v2/backup/export'))
      .send({ include_secrets: true, confirm_secrets_export: 'EXPORT_UNREDACTED_BACKUP', compress: true })
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
