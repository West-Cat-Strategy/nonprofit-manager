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

const expectCanonicalError = (
  response: { body: { success?: boolean; error?: { code?: string; message?: string } } },
  code: string,
  message?: string
): void => {
  expect(response.body.success).toBe(false);
  expect(response.body.error?.code).toBe(code);
  if (message) {
    expect(response.body.error?.message).toBe(message);
  }
};

describe('People import/export integration', () => {
  let authToken = '';
  let authTokenWithOrganizationContext = '';
  let userId = '';
  let userEmail = '';
  let organizationId = '';
  let organizationAccountNumber = '';

  const withAuth = (req: Test): Test => req.set('Authorization', `Bearer ${authToken}`);
  const withOrgAuth = (req: Test): Test =>
    req
      .set('Authorization', `Bearer ${authTokenWithOrganizationContext || authToken}`)
      .set('X-Organization-Id', organizationId);
  const createOrganization = async (
    overrides: Partial<{
      account_name: string;
      email: string;
    }> = {}
  ): Promise<{ accountId: string; accountNumber: string }> => {
    const response = await withAuth(
      request(app)
        .post('/api/v2/accounts')
        .send({
          account_name: overrides.account_name || `People Import Export Org ${unique()}`,
          account_type: 'organization',
          ...(overrides.email ? { email: overrides.email } : {}),
        })
    ).expect(201);

    const accountId = accountIdFromResponse(response.body) || '';
    expect(accountId).toBeTruthy();

    const result = await pool.query<{ account_number: string }>(
      'SELECT account_number FROM accounts WHERE id = $1',
      [accountId]
    );
    const accountNumber = result.rows[0]?.account_number || '';
    expect(accountNumber).toBeTruthy();

    return { accountId, accountNumber };
  };

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

    const organization = await createOrganization();
    organizationId = organization.accountId;
    organizationAccountNumber = organization.accountNumber;
    authTokenWithOrganizationContext = jwt.sign(
      {
        id: userId,
        email: userEmail.toLowerCase(),
        role: 'admin',
        organizationId,
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
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

  it('downloads people import templates with the expected formats', async () => {
    const accountTemplateResponse = await withAuth(
      request(app)
        .get('/api/v2/accounts/import/template')
        .query({ format: 'csv' })
    ).expect(200);

    expect(accountTemplateResponse.headers['content-type']).toContain('text/csv');
    expect(accountTemplateResponse.headers['content-disposition']).toContain(
      'accounts-import-template.csv'
    );
    expect(accountTemplateResponse.text.split('\n')[0]).toContain('account_id');

    const contactTemplateResponse = await withOrgAuth(
      request(app)
        .get('/api/v2/contacts/import/template')
        .query({ format: 'csv' })
    ).expect(200);

    expect(contactTemplateResponse.headers['content-type']).toContain('text/csv');
    expect(contactTemplateResponse.text.split('\n')[0]).toContain('account_id');
    expect(contactTemplateResponse.text.split('\n')[0]).toContain('account_number');

    const volunteerTemplateResponse = await withOrgAuth(
      request(app)
        .get('/api/v2/volunteers/import/template')
        .query({ format: 'xlsx' })
    ).expect(200);

    expect(volunteerTemplateResponse.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(volunteerTemplateResponse.headers['content-disposition']).toContain(
      'volunteers-import-template.xlsx'
    );
  });

  it('requires explicit organization context for organization-scoped import routes', async () => {
    const csv = ['first_name,last_name,email', 'Missing,Org,missing-org@example.com'].join('\n');

    const contactsPreviewResponse = await withAuth(
      request(app)
        .post('/api/v2/contacts/import/preview')
        .attach('file', Buffer.from(csv), {
          filename: 'contacts-import.csv',
          contentType: 'text/csv',
        })
    ).expect(400);

    expectCanonicalError(
      contactsPreviewResponse,
      'bad_request',
      'No organization context'
    );

    const volunteersTemplateResponse = await withAuth(
      request(app)
        .get('/api/v2/volunteers/import/template')
        .query({ format: 'csv' })
    ).expect(400);

    expectCanonicalError(
      volunteersTemplateResponse,
      'bad_request',
      'No organization context'
    );

    const contactsTemplateWithTokenContextResponse = await request(app)
      .get('/api/v2/contacts/import/template')
      .query({ format: 'csv' })
      .set('Authorization', `Bearer ${authTokenWithOrganizationContext}`)
      .expect(400);

    expectCanonicalError(
      contactsTemplateWithTokenContextResponse,
      'bad_request',
      'No organization context'
    );
  });

  it('counts only committable account actions in preview totals', async () => {
    const duplicateAccountNumber = `ACC-DUP-${unique()}`;
    const csv = [
      'account_number,account_name,account_type',
      `${duplicateAccountNumber},Duplicate Account One,organization`,
      `${duplicateAccountNumber},Duplicate Account Two,organization`,
    ].join('\n');

    const previewResponse = await withAuth(
      request(app)
        .post('/api/v2/accounts/import/preview')
        .attach('file', Buffer.from(csv), {
          filename: 'accounts-duplicate.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const preview = payloadFromResponse<{
      to_create: number;
      to_update: number;
      total_rows: number;
      row_errors: Array<{ row_number: number; messages: string[] }>;
    }>(previewResponse.body);

    expect(preview.total_rows).toBe(2);
    expect(preview.to_create).toBe(1);
    expect(preview.to_update).toBe(0);
    expect(preview.row_errors).toHaveLength(1);
    expect(preview.row_errors[0]?.messages.join(' ')).toContain('appears more than once');
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
      'contact_id,account_id,account_number,first_name,last_name,email,phone,tags',
      `${existingContactId},,${organizationAccountNumber},Updated,Contact,${existingEmail},555-222-2000,support;priority`,
      `,,${organizationAccountNumber},New,Imported,${newContactEmail},555-333-3000,new;board`,
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

  it('rejects cross-organization account references during contact import preview and commit', async () => {
    const foreignOrganization = await createOrganization({
      account_name: `Foreign Contact Org ${unique()}`,
    });
    const blockedEmail = `cross-org-contact-${unique()}@example.com`;
    const csv = [
      'account_id,account_number,first_name,last_name,email',
      `,${foreignOrganization.accountNumber},Cross,Org,${blockedEmail}`,
    ].join('\n');

    const previewResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/contacts/import/preview')
        .attach('file', Buffer.from(csv), {
          filename: 'contacts-cross-org.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const preview = payloadFromResponse<{
      row_errors: Array<{ row_number: number; messages: string[] }>;
    }>(previewResponse.body);

    expect(preview.row_errors).toHaveLength(1);
    expect(preview.row_errors[0]?.messages.join(' ')).toContain(
      `Account number ${foreignOrganization.accountNumber} was not found.`
    );

    await withOrgAuth(
      request(app)
        .post('/api/v2/contacts/import/commit')
        .attach('file', Buffer.from(csv), {
          filename: 'contacts-cross-org.csv',
          contentType: 'text/csv',
        })
    ).expect(400);

    const blockedContactResult = await pool.query('SELECT id FROM contacts WHERE email = $1', [
      blockedEmail.toLowerCase(),
    ]);
    expect(blockedContactResult.rowCount).toBe(0);
  });

  it('round-trips exported contact CSV files with multiline fields', async () => {
    const multilineNotes = `Line one ${unique()}\nLine two ${unique()}`;
    const roundTripMapping = {
      contact_id: 'contact_id',
      account_number: 'account_number',
      first_name: 'first_name',
      last_name: 'last_name',
      email: 'email',
      notes: 'notes',
    };
    const contactResult = await pool.query<{ id: string }>(
      `
        INSERT INTO contacts (account_id, first_name, last_name, email, notes, created_by, modified_by)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        RETURNING id
      `,
      [
        organizationId,
        'Roundtrip',
        'Contact',
        `roundtrip-contact-${unique()}@example.com`,
        multilineNotes,
        userId,
      ]
    );
    const contactId = contactResult.rows[0]?.id || '';
    expect(contactId).toBeTruthy();

    const exportResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/contacts/export')
        .send({
          format: 'csv',
          ids: [contactId],
          columns: Object.keys(roundTripMapping),
        })
    ).expect(200);

    const previewResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/contacts/import/preview')
        .field('mapping', JSON.stringify(roundTripMapping))
        .attach('file', Buffer.from(exportResponse.text), {
          filename: 'contacts-roundtrip.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const preview = payloadFromResponse<{
      total_rows: number;
      to_create: number;
      to_update: number;
      row_errors: Array<{ row_number: number; messages: string[] }>;
    }>(previewResponse.body);

    expect(preview.total_rows).toBe(1);
    expect(preview.to_create).toBe(0);
    expect(preview.to_update).toBe(1);
    expect(preview.row_errors).toEqual([]);

    const commitResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/contacts/import/commit')
        .field('mapping', JSON.stringify(roundTripMapping))
        .attach('file', Buffer.from(exportResponse.text), {
          filename: 'contacts-roundtrip.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const commit = payloadFromResponse<{
      created: number;
      updated: number;
      affected_ids: string[];
    }>(commitResponse.body);

    expect(commit.created).toBe(0);
    expect(commit.updated).toBe(1);
    expect(commit.affected_ids).toEqual([contactId]);

    const updatedContactResult = await pool.query<{ notes: string | null }>(
      'SELECT notes FROM contacts WHERE id = $1',
      [contactId]
    );
    expect(updatedContactResult.rows[0]?.notes).toBe(multilineNotes);
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
      'contact_id,account_id,account_number,first_name,last_name,email,phone,skills,availability_status,background_check_status',
      `${existingContactId},,${organizationAccountNumber},Volunteer,Existing,${existingVolunteerContactEmail},555-444-4000,Driving;First Aid,available,approved`,
      `,,${organizationAccountNumber},Volunteer,New,${newVolunteerEmail},555-555-5000,Translation;Support,limited,pending`,
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

  it('rejects cross-organization account references during volunteer import preview and commit', async () => {
    const foreignOrganization = await createOrganization({
      account_name: `Foreign Volunteer Org ${unique()}`,
    });
    const blockedEmail = `cross-org-volunteer-${unique()}@example.com`;
    const csv = [
      'account_id,first_name,last_name,email,skills',
      `${foreignOrganization.accountId},Cross,Volunteer,${blockedEmail},Support`,
    ].join('\n');

    const previewResponse = await withOrgAuth(
      request(app)
        .post('/api/v2/volunteers/import/preview')
        .attach('file', Buffer.from(csv), {
          filename: 'volunteers-cross-org.csv',
          contentType: 'text/csv',
        })
    ).expect(200);

    const preview = payloadFromResponse<{
      row_errors: Array<{ row_number: number; messages: string[] }>;
    }>(previewResponse.body);

    expect(preview.row_errors).toHaveLength(1);
    expect(preview.row_errors[0]?.messages.join(' ')).toContain(
      `Account ID ${foreignOrganization.accountId} was not found.`
    );

    await withOrgAuth(
      request(app)
        .post('/api/v2/volunteers/import/commit')
        .attach('file', Buffer.from(csv), {
          filename: 'volunteers-cross-org.csv',
          contentType: 'text/csv',
        })
    ).expect(400);

    const blockedVolunteerContactResult = await pool.query(
      'SELECT id FROM contacts WHERE email = $1',
      [blockedEmail.toLowerCase()]
    );
    expect(blockedVolunteerContactResult.rowCount).toBe(0);
  });
});
