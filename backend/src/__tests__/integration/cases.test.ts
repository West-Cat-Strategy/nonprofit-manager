import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Case API Integration Tests', () => {
  let authToken = '';
  let testEmail = '';
  let userId = '';
  let organizationId = '';
  let caseTypeId = '';
  const createdCaseIds: string[] = [];
  const createdContactIds: string[] = [];
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

  const tokenFromResponse = (body: unknown): string | undefined => {
    if (typeof body !== 'object' || body === null) {
      return undefined;
    }

    const value = body as { token?: string; data?: { token?: string } };
    return value.token || value.data?.token;
  };

  const accountIdFromResponse = (body: unknown): string | undefined => {
    if (typeof body !== 'object' || body === null) {
      return undefined;
    }

    const value = body as { account_id?: string; data?: { account_id?: string } };
    return value.account_id || value.data?.account_id;
  };

  const withAuth = (req: ReturnType<typeof request>): ReturnType<typeof request> =>
    req
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId);

  const cleanupCreatedCases = async (): Promise<void> => {
    if (createdCaseIds.length === 0) {
      return;
    }

    await pool.query('DELETE FROM case_notes WHERE case_id = ANY($1::uuid[])', [createdCaseIds]);
    await pool.query('DELETE FROM cases WHERE id = ANY($1::uuid[])', [createdCaseIds]);
    createdCaseIds.length = 0;
  };

  const cleanupCreatedContacts = async (): Promise<void> => {
    if (createdContactIds.length === 0) {
      return;
    }

    await pool.query('DELETE FROM contacts WHERE id = ANY($1::uuid[])', [createdContactIds]);
    createdContactIds.length = 0;
  };

  const createContact = async (accountId?: string): Promise<string> => {
    const suffix = unique();
    const response = await withAuth(request(app)
      .post('/api/v2/contacts')
      .send({
        ...(accountId ? { account_id: accountId } : {}),
        first_name: `Case-${suffix}`,
        last_name: 'Owner',
      }))
      .expect(201);

    const payload = payloadFromResponse<{ contact_id?: string; id?: string }>(response.body);
    const contactId = payload.contact_id ?? payload.id;
    if (!contactId) {
      throw new Error('Failed to create test contact');
    }

    createdContactIds.push(contactId);
    return contactId;
  };

  const createCaseWithoutAccount = async (contactId: string, title: string): Promise<{
    id: string;
    contact_id: string;
    account_id: string | null;
    title: string;
  }> => {
    const response = await withAuth(request(app)
      .post('/api/v2/cases')
      .send({
        contact_id: contactId,
        case_type_id: caseTypeId,
        title,
      }))
      .expect(201);

    const payload = payloadFromResponse<{
      id: string;
      contact_id: string;
      account_id: string | null;
      title: string;
    }>(response.body);

    createdCaseIds.push(payload.id);
    return payload;
  };

  const expectCaseVisibleWithDefaultedOrgAccount = async (contactAccountId?: string): Promise<void> => {
    const contactId = await createContact(contactAccountId);
    const title = `Ownership default ${unique()}`;
    const createdCase = await createCaseWithoutAccount(contactId, title);

    expect(createdCase.account_id).toBe(organizationId);

    const storedCaseResult = await pool.query<{ account_id: string | null }>(
      'SELECT account_id FROM cases WHERE id = $1',
      [createdCase.id]
    );
    expect(storedCaseResult.rows[0]?.account_id).toBe(organizationId);

    const listResponse = await withAuth(request(app)
      .get('/api/v2/cases')
      .query({ search: title }))
      .expect(200);

    const listPayload = payloadFromResponse<{
      cases: Array<{ id: string; account_id: string | null; title: string }>;
      total: number;
    }>(listResponse.body);

    expect(listPayload.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdCase.id,
          account_id: organizationId,
          title,
        }),
      ])
    );

    const detailResponse = await withAuth(request(app)
      .get(`/api/v2/cases/${createdCase.id}`))
      .expect(200);

    const detailPayload = payloadFromResponse<{
      id: string;
      contact_id: string;
      account_id: string | null;
      title: string;
    }>(detailResponse.body);

    expect(detailPayload).toEqual(
      expect.objectContaining({
        id: createdCase.id,
        contact_id: contactId,
        account_id: organizationId,
        title,
      })
    );
  };

  beforeAll(async () => {
    testEmail = `cases-test-${unique()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email: testEmail,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Case',
        last_name: 'Tester',
      })
      .expect(201);

    authToken = tokenFromResponse(registerResponse.body) || '';
    expect(authToken).toBeTruthy();

    const registerPayload = payloadFromResponse<{
      user?: {
        id: string;
      };
    }>(registerResponse.body);
    userId = registerPayload.user?.id || '';
    expect(userId).toBeTruthy();

    const accountResponse = await request(app)
      .post('/api/v2/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        account_name: `Case Test Organization ${unique()}`,
        account_type: 'organization',
      })
      .expect(201);

    organizationId = accountIdFromResponse(accountResponse.body) || '';
    expect(organizationId).toBeTruthy();

    const caseTypeResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM case_types
       WHERE is_active = true
       ORDER BY sort_order ASC NULLS LAST, created_at ASC
       LIMIT 1`
    );
    caseTypeId = caseTypeResult.rows[0]?.id || '';
    expect(caseTypeId).toBeTruthy();
  });

  afterEach(async () => {
    await cleanupCreatedCases();
    await cleanupCreatedContacts();
  });

  afterAll(async () => {
    await cleanupCreatedCases();
    await cleanupCreatedContacts();

    if (userId) {
      await pool.query('DELETE FROM contacts WHERE created_by = $1', [userId]);
    }

    if (organizationId) {
      await pool.query('DELETE FROM case_notes WHERE case_id IN (SELECT id FROM cases WHERE account_id = $1)', [
        organizationId,
      ]);
      await pool.query('DELETE FROM cases WHERE account_id = $1', [organizationId]);
      await pool.query('DELETE FROM user_account_access WHERE account_id = $1', [organizationId]);
      await pool.query('DELETE FROM accounts WHERE id = $1', [organizationId]);
    }

    if (testEmail) {
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail.toLowerCase()]);
    }
  });

  it('requires auth for v2 list endpoint', async () => {
    await request(app).get('/api/v2/cases').expect(401);
  });

  it('returns tombstone response for v1 list endpoint', async () => {
    const response = await request(app)
      .get('/api/cases')
      .expect(410);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error.code', 'legacy_api_removed');
    expect(response.body).toHaveProperty('error.details.legacyPath', '/api/cases');
    expect(response.body).toHaveProperty('error.details.migrationPath', '/api/v2/cases');
  });

  it('serves v2 list with success envelope', async () => {
    const response = await withAuth(request(app)
      .get('/api/v2/cases'))
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data.cases)).toBe(true);
  });

  it('tombstones v1 metadata endpoint and serves v2 metadata endpoint', async () => {
    const v1Types = await request(app)
      .get('/api/cases/types')
      .expect(410);

    const v2Types = await withAuth(request(app)
      .get('/api/v2/cases/types'))
      .expect(200);

    expect(v1Types.body).toHaveProperty('success', false);
    expect(v1Types.body).toHaveProperty('error.code', 'legacy_api_removed');
    expect(v1Types.body).toHaveProperty('error.details.legacyPath', '/api/cases/types');
    expect(v1Types.body).toHaveProperty('error.details.migrationPath', '/api/v2/cases/types');
    expect(v2Types.body).toHaveProperty('success', true);
    expect(Array.isArray(v2Types.body.data)).toBe(true);
  });

  it('defaults omitted account_id to the active organization for org-owned contacts', async () => {
    await expectCaseVisibleWithDefaultedOrgAccount(organizationId);
  });

  it('defaults omitted account_id to the active organization for contacts without org ownership', async () => {
    await expectCaseVisibleWithDefaultedOrgAccount();
  });
});
