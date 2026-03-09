import request, { type Test } from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const payloadFromResponse = <T>(body: unknown): T => {
  if (typeof body === 'object' && body !== null && 'data' in body) {
    const value = body as { data?: T };
    if (value.data !== undefined) {
      return value.data;
    }
  }

  return body as T;
};

const accountIdFromResponse = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  const value = body as { account_id?: string; data?: { account_id?: string } };
  return value.account_id || value.data?.account_id;
};

describe('People import/export integration', () => {
  let authToken = '';
  let userId = '';
  let userEmail = '';
  let organizationId = '';
  let organizationAccountNumber = '';

  const withAuth = (req: Test): Test => req.set('Authorization', `Bearer ${authToken}`);
  const withOrgAuth = (req: Test): Test =>
    withAuth(req).set('X-Organization-Id', organizationId);

  beforeAll(async () => {
    userEmail = `people-import-export-${unique()}@example.com`;
    const userResult = await pool.query<{ id: string }>(
      `
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [userEmail.toLowerCase(), 'test-hash', 'People', 'Importer', 'admin']
    );
    userId = userResult.rows[0]?.id || '';
    expect(userId).toBeTruthy();

    authToken = jwt.sign(
      {
        id: userId,
        email: userEmail.toLowerCase(),
        role: 'admin',
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    const organizationResponse = await withAuth(
      request(app)
        .post('/api/v2/accounts')
        .send({
          account_name: `People Import Export Org ${unique()}`,
          account_type: 'organization',
        })
    ).expect(201);

    organizationId = accountIdFromResponse(organizationResponse.body) || '';
    expect(organizationId).toBeTruthy();

    const organizationResult = await pool.query<{ account_number: string }>(
      'SELECT account_number FROM accounts WHERE id = $1',
      [organizationId]
    );
    organizationAccountNumber = organizationResult.rows[0]?.account_number || '';
    expect(organizationAccountNumber).toBeTruthy();
  });

  afterAll(async () => {
    if (userId) {
      await pool.query(
        `
          DELETE FROM volunteers
          WHERE created_by = $1
             OR contact_id IN (SELECT id FROM contacts WHERE created_by = $1)
        `,
        [userId]
      );
      await pool.query(
        `
          DELETE FROM contact_role_assignments
          WHERE contact_id IN (SELECT id FROM contacts WHERE created_by = $1)
        `,
        [userId]
      );
      await pool.query('DELETE FROM contacts WHERE created_by = $1', [userId]);
      await pool.query('DELETE FROM accounts WHERE created_by = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  it('imports and exports accounts with preview-before-commit flow', async () => {
    const existingAccountResponse = await withAuth(
      request(app)
        .post('/api/v2/accounts')
        .send({
          account_name: `Existing Import Account ${unique()}`,
          account_type: 'organization',
          email: `existing-account-${unique()}@example.com`,
        })
    ).expect(201);

    const existingAccountId = accountIdFromResponse(existingAccountResponse.body) || '';
    expect(existingAccountId).toBeTruthy();

    const existingAccountRow = await pool.query<{ account_number: string }>(
      'SELECT account_number FROM accounts WHERE id = $1',
      [existingAccountId]
    );
    const existingAccountNumber = existingAccountRow.rows[0]?.account_number;
    expect(existingAccountNumber).toBeTruthy();

    const newImportedAccountName = `Imported Account ${unique()}`;
    const csv = [
      'account_number,account_name,account_type,email',
      `${existingAccountNumber},Updated Imported Account,organization,updated-account@example.com`,
      `,${newImportedAccountName},individual,new-account-${unique()}@example.com`,
    ].join('\n');

    const previewResponse = await withAuth(
      request(app)
        .post('/api/v2/accounts/import/preview')
        .attach('file', Buffer.from(csv), {
          filename: 'accounts-import.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const preview = payloadFromResponse<{
      to_create: number;
      to_update: number;
      row_errors: Array<{ row_number: number; messages: string[] }>;
    }>(previewResponse.body);

    expect(preview.to_create).toBe(1);
    expect(preview.to_update).toBe(1);
    expect(preview.row_errors).toEqual([]);

    const commitResponse = await withAuth(
      request(app)
        .post('/api/v2/accounts/import/commit')
        .attach('file', Buffer.from(csv), {
          filename: 'accounts-import.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const commit = payloadFromResponse<{
      created: number;
      updated: number;
      total_processed: number;
      affected_ids: string[];
    }>(commitResponse.body);

    expect(commit.created).toBe(1);
    expect(commit.updated).toBe(1);
    expect(commit.total_processed).toBe(2);
    expect(commit.affected_ids).toHaveLength(2);

    const exportResponse = await withAuth(
      request(app)
        .post('/api/v2/accounts/export')
        .send({
          format: 'csv',
          ids: commit.affected_ids,
        })
    ).expect(200);

    expect(exportResponse.headers['content-type']).toContain('text/csv');
    expect(exportResponse.headers['content-disposition']).toContain('.csv');
    expect(exportResponse.text.split('\n')[0]).toContain('account_id');
    expect(exportResponse.text.split('\n')[0]).toContain('account_number');
  });

  it('requires authentication for contact imports', async () => {
    const csv = ['first_name,last_name,email', 'Missing,Org,missing-org@example.com'].join('\n');

    await request(app)
      .post('/api/v2/contacts/import/preview')
      .attach('file', Buffer.from(csv), {
        filename: 'contacts-import.csv',
        contentType: 'text/csv',
      })
      .expect(401);
  });

  it('imports contacts with account_number lookup and rolls back invalid commits', async () => {
    const existingEmail = `existing-contact-${unique()}@example.com`;
    const existingContactResult = await pool.query<{ id: string }>(
      `
        INSERT INTO contacts (account_id, first_name, last_name, email, created_by, modified_by)
        VALUES ($1, $2, $3, $4, $5, $5)
        RETURNING id
      `,
      [organizationId, 'Existing', 'Contact', existingEmail.toLowerCase(), userId]
    );
    const existingContactId = existingContactResult.rows[0]?.id || '';
    expect(existingContactId).toBeTruthy();

    const newContactEmail = `imported-contact-${unique()}@example.com`;

    const csv = [
      'contact_id,account_number,first_name,last_name,email,phone,tags',
      `${existingContactId},${organizationAccountNumber},Updated,Contact,${existingEmail},555-222-2000,support;priority`,
      `,${organizationAccountNumber},New,Imported,${newContactEmail},555-333-3000,new;board`,
    ].join('\n');

    const previewResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/contacts/import/preview')
        .attach('file', Buffer.from(csv), {
          filename: 'contacts-import.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const preview = payloadFromResponse<{
      to_create: number;
      to_update: number;
      row_errors: Array<{ row_number: number; messages: string[] }>;
    }>(previewResponse.body);

    expect(preview.to_create).toBe(1);
    expect(preview.to_update).toBe(1);
    expect(preview.row_errors).toEqual([]);

    const commitResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/contacts/import/commit')
        .attach('file', Buffer.from(csv), {
          filename: 'contacts-import.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const commit = payloadFromResponse<{
      created: number;
      updated: number;
      affected_ids: string[];
    }>(commitResponse.body);

    expect(commit.created).toBe(1);
    expect(commit.updated).toBe(1);
    expect(commit.affected_ids).toHaveLength(2);

    const createdContactResult = await pool.query<{ id: string; account_id: string }>(
      'SELECT id, account_id FROM contacts WHERE email = $1',
      [newContactEmail.toLowerCase()]
    );
    expect(createdContactResult.rows[0]?.account_id).toBe(organizationId);

    const exportResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/contacts/export')
        .send({
          format: 'csv',
          ids: commit.affected_ids,
        })
    ).expect(200);

    expect(exportResponse.headers['content-type']).toContain('text/csv');
    expect(exportResponse.text.split('\n')[0]).toContain('contact_id');
    expect(exportResponse.text.split('\n')[0]).toContain('account_number');

    const invalidEmail = `rollback-contact-${unique()}@example.com`;
    const invalidCsv = [
      'first_name,last_name,email,account_number',
      `Broken,Import,${invalidEmail},missing-account-number`,
    ].join('\n');

    const invalidCommitResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/contacts/import/commit')
        .attach('file', Buffer.from(invalidCsv), {
          filename: 'contacts-invalid.csv',
          contentType: 'text/csv',
        })
    ).expect(400);

    expect(JSON.stringify(invalidCommitResponse.body)).toContain('row_errors');

    const invalidContactResult = await pool.query('SELECT id FROM contacts WHERE email = $1', [
      invalidEmail.toLowerCase(),
    ]);
    expect(invalidContactResult.rowCount).toBe(0);
  });

  it('imports volunteers through existing and new contacts, then exports xlsx', async () => {
    const existingVolunteerContactEmail = `volunteer-contact-${unique()}@example.com`;
    const existingContactResult = await pool.query<{ id: string }>(
      `
        INSERT INTO contacts (account_id, first_name, last_name, email, created_by, modified_by)
        VALUES ($1, $2, $3, $4, $5, $5)
        RETURNING id
      `,
      [organizationId, 'Volunteer', 'Existing', existingVolunteerContactEmail.toLowerCase(), userId]
    );
    const existingContactId = existingContactResult.rows[0]?.id || '';
    expect(existingContactId).toBeTruthy();

    const newVolunteerEmail = `new-volunteer-${unique()}@example.com`;

    const csv = [
      'contact_id,account_number,first_name,last_name,email,phone,skills,availability_status,background_check_status',
      `${existingContactId},${organizationAccountNumber},Volunteer,Existing,${existingVolunteerContactEmail},555-444-4000,Driving;First Aid,available,approved`,
      `,${organizationAccountNumber},Volunteer,New,${newVolunteerEmail},555-555-5000,Translation;Support,limited,pending`,
    ].join('\n');

    const previewResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/volunteers/import/preview')
        .attach('file', Buffer.from(csv), {
          filename: 'volunteers-import.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const preview = payloadFromResponse<{
      to_create: number;
      to_update: number;
      row_errors: Array<{ row_number: number; messages: string[] }>;
    }>(previewResponse.body);

    expect(preview.to_create).toBe(2);
    expect(preview.to_update).toBe(0);
    expect(preview.row_errors).toEqual([]);

    const commitResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/volunteers/import/commit')
        .attach('file', Buffer.from(csv), {
          filename: 'volunteers-import.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const commit = payloadFromResponse<{
      created: number;
      updated: number;
      affected_ids: string[];
    }>(commitResponse.body);

    expect(commit.created).toBe(2);
    expect(commit.updated).toBe(0);
    expect(commit.affected_ids).toHaveLength(2);

    const exportResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/volunteers/export')
        .send({
          format: 'xlsx',
          ids: commit.affected_ids,
        })
    ).expect(200);

    expect(exportResponse.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(exportResponse.headers['content-disposition']).toContain('.xlsx');
  });
});
