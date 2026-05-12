import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Case API Integration Tests', () => {
  let authToken = '';
  let testEmail = '';
  let userId = '';
  let organizationId = '';
  let caseTypeId = '';
  let activeStatusId = '';
  let outcomeDefinitionId = '';
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

    await pool.query('DELETE FROM case_reassessment_cycles WHERE case_id = ANY($1::uuid[])', [
      createdCaseIds,
    ]);
    await pool.query(
      "DELETE FROM follow_ups WHERE entity_type = 'case' AND entity_id = ANY($1::uuid[])",
      [createdCaseIds]
    );
    await pool.query('DELETE FROM case_notes WHERE case_id = ANY($1::uuid[])', [createdCaseIds]);
    await pool.query('DELETE FROM case_outcomes WHERE case_id = ANY($1::uuid[])', [createdCaseIds]);
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

    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', userId]);

    const loginResponse = await request(app)
      .post('/api/v2/auth/login')
      .send({ email: testEmail, password: 'Test123!Strong' })
      .expect(200);
    authToken = tokenFromResponse(loginResponse.body) || '';
    expect(authToken).toBeTruthy();

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

    await pool.query(
      `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
       VALUES ($1, $2, 'owner', $1, true)
       ON CONFLICT (user_id, account_id) DO UPDATE
       SET access_level = EXCLUDED.access_level,
           granted_by = EXCLUDED.granted_by,
           is_active = true`,
      [userId, organizationId]
    );

    const caseTypeResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM case_types
       WHERE is_active = true
       ORDER BY name ASC, created_at ASC
       LIMIT 1`
    );
    caseTypeId = caseTypeResult.rows[0]?.id || '';
    expect(caseTypeId).toBeTruthy();

    const activeStatusResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM case_statuses
       WHERE is_active = true
       ORDER BY sort_order ASC NULLS LAST, created_at ASC
       LIMIT 1`
    );
    activeStatusId = activeStatusResult.rows[0]?.id || '';
    expect(activeStatusId).toBeTruthy();

    const outcomeDefinitionResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM outcome_definitions
       WHERE is_active = true
       ORDER BY sort_order ASC, name ASC
       LIMIT 1`
    );
    outcomeDefinitionId = outcomeDefinitionResult.rows[0]?.id || '';
    expect(outcomeDefinitionId).toBeTruthy();
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

  it('opens CBIS-imported null-account cases when provenance scopes them to the active organization', async () => {
    const suffix = unique();
    const contactId = (
      await pool.query<{ id: string }>(
        `INSERT INTO contacts (
           first_name,
           last_name,
           email,
           account_id,
           created_by,
           modified_by
         ) VALUES ($1, $2, $3, NULL, $4, $4)
         RETURNING id`,
        ['Imported', 'CaseLink', `imported-case-link-${suffix}@example.com`, userId]
      )
    ).rows[0].id;
    createdContactIds.push(contactId);

    const caseId = (
      await pool.query<{ id: string }>(
        `INSERT INTO cases (
           case_number,
           contact_id,
           account_id,
           case_type_id,
           title,
           status_id,
           custom_data,
           created_by,
           modified_by,
           created_at,
           updated_at
         ) VALUES ($1, $2, NULL, $3, $4, $5, $6::jsonb, $7, $7, NOW(), NOW())
         RETURNING id`,
        [
          `CBIS-TICIPANT-${suffix}`,
          contactId,
          caseTypeId,
          'Imported case link visibility',
          activeStatusId,
          JSON.stringify({
            import_provenance: {
              cluster_id: `cluster-${suffix}`,
              primary_label: 'Imported case link visibility',
              record_type: 'case_note',
              source_tables: ['case_note'],
              source_files: [`cbis-${suffix}.csv`],
              source_row_ids: [`case_note:${suffix}`],
              participant_ids: [contactId],
            },
          }),
          userId,
        ]
      )
    ).rows[0].id;
    createdCaseIds.push(caseId);

    const noteId = (
      await pool.query<{ id: string }>(
        `INSERT INTO case_notes (
           case_id,
           note_type,
           subject,
           content,
           is_internal,
           visible_to_client,
           created_by,
           updated_by,
           created_at,
           updated_at
         ) VALUES ($1, 'note', $2, $3, false, true, $4, $4, NOW(), NOW())
         RETURNING id`,
        [caseId, 'Imported linked case note', 'This note should be reachable from the case link.', userId]
      )
    ).rows[0].id;

    await pool.query(
      `INSERT INTO cbis_import_target_provenance (
         organization_id,
         target_entity_type,
         target_entity_id,
         source_file,
         source_table,
         source_row_id,
         source_row_hash,
         bundle_fingerprint,
         schema_bundle_version
       ) VALUES
         ($1, 'cases', $2, $3, 'case_note', $4, $5, $6, $7),
         ($1, 'contacts', $8, $3, 'client', $9, $10, $6, $7)`,
      [
        organizationId,
        caseId,
        `cbis-${suffix}.csv`,
        `case_note:${suffix}`,
        `case-hash-${suffix}`,
        `sha256:${suffix}`,
        'test-schema',
        contactId,
        `client:${suffix}`,
        `contact-hash-${suffix}`,
      ]
    );

    try {
      const detailResponse = await withAuth(request(app)
        .get(`/api/v2/cases/${caseId}`))
        .expect(200);

      const detailPayload = payloadFromResponse<{
        id: string;
        account_id: string | null;
        contact_id: string;
        case_number: string;
      }>(detailResponse.body);
      expect(detailPayload).toEqual(
        expect.objectContaining({
          id: caseId,
          account_id: null,
          contact_id: contactId,
          case_number: `CBIS-TICIPANT-${suffix}`,
        })
      );

      const listResponse = await withAuth(request(app)
        .get('/api/v2/cases')
        .query({ contact_id: contactId }))
        .expect(200);
      const listPayload = payloadFromResponse<{
        cases: Array<{ id: string }>;
      }>(listResponse.body);
      expect(listPayload.cases.filter((item) => item.id === caseId)).toHaveLength(1);

      const timelineResponse = await withAuth(request(app)
        .get(`/api/v2/cases/${caseId}/timeline`))
        .expect(200);
      const timelinePayload = payloadFromResponse<{
        items: Array<{ id: string; type?: string }>;
      }>(timelineResponse.body);
      expect(timelinePayload.items.map((item) => item.id)).toContain(noteId);

      const notesResponse = await withAuth(request(app)
        .get(`/api/v2/cases/${caseId}/notes`))
        .expect(200);
      const notesPayload = payloadFromResponse<Array<{ id: string }>>(notesResponse.body);
      expect(notesPayload.map((item) => item.id)).toContain(noteId);

      await request(app)
        .get(`/api/v2/cases/${caseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', '11111111-1111-4111-8111-111111111111')
        .expect(404);
    } finally {
      await pool.query(
        `DELETE FROM cbis_import_target_provenance
         WHERE organization_id = $1
           AND source_file = $2`,
        [organizationId, `cbis-${suffix}.csv`]
      );
    }
  });

  it('accepts legacy singular CBIS target provenance labels for imported case scope', async () => {
    const suffix = unique();
    const contactId = (
      await pool.query<{ id: string }>(
        `INSERT INTO contacts (
           first_name,
           last_name,
           email,
           account_id,
           created_by,
           modified_by
         ) VALUES ($1, $2, $3, NULL, $4, $4)
         RETURNING id`,
        ['Imported', 'SingularCaseLink', `imported-singular-case-link-${suffix}@example.com`, userId]
      )
    ).rows[0].id;
    createdContactIds.push(contactId);

    const caseId = (
      await pool.query<{ id: string }>(
        `INSERT INTO cases (
           case_number,
           contact_id,
           account_id,
           case_type_id,
           title,
           status_id,
           created_by,
           modified_by,
           created_at,
           updated_at
         ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $6, NOW(), NOW())
         RETURNING id`,
        [
          `CBIS-SINGULAR-${suffix}`,
          contactId,
          caseTypeId,
          'Imported singular provenance case',
          activeStatusId,
          userId,
        ]
      )
    ).rows[0].id;
    createdCaseIds.push(caseId);

    await pool.query(
      `INSERT INTO cbis_import_target_provenance (
         organization_id,
         target_entity_type,
         target_entity_id,
         source_file,
         source_table,
         source_row_id,
         source_row_hash,
         bundle_fingerprint,
         schema_bundle_version
       ) VALUES
         ($1, 'case', $2, $3, 'Upload File', $4, $5, $6, $7),
         ($1, 'contact', $8, $3, 'Upload File', $9, $10, $6, $7)`,
      [
        organizationId,
        caseId,
        `cbis-singular-${suffix}.csv`,
        `upload_file:${suffix}`,
        `singular-case-hash-${suffix}`,
        `sha256:singular-${suffix}`,
        'test-schema',
        contactId,
        `contact:${suffix}`,
        `singular-contact-hash-${suffix}`,
      ]
    );

    try {
      await withAuth(request(app)
        .get(`/api/v2/cases/${caseId}`))
        .expect(200);

      const listResponse = await withAuth(request(app)
        .get('/api/v2/cases')
        .query({ contact_id: contactId }))
        .expect(200);
      const listPayload = payloadFromResponse<{ cases: Array<{ id: string }> }>(listResponse.body);
      expect(listPayload.cases.map((item) => item.id)).toContain(caseId);
    } finally {
      await pool.query(
        `DELETE FROM cbis_import_target_provenance
         WHERE organization_id = $1
           AND source_file = $2`,
        [organizationId, `cbis-singular-${suffix}.csv`]
      );
    }
  });

  it('keeps null-account cases hidden when no CBIS provenance scopes them', async () => {
    const suffix = unique();
    const contactId = (
      await pool.query<{ id: string }>(
        `INSERT INTO contacts (
           first_name,
           last_name,
           email,
           account_id,
           created_by,
           modified_by
         ) VALUES ($1, $2, $3, NULL, $4, $4)
         RETURNING id`,
        ['Unproven', 'CaseLink', `unproven-case-link-${suffix}@example.com`, userId]
      )
    ).rows[0].id;
    createdContactIds.push(contactId);

    const caseId = (
      await pool.query<{ id: string }>(
        `INSERT INTO cases (
           case_number,
           contact_id,
           account_id,
           case_type_id,
           title,
           status_id,
           created_by,
           modified_by,
           created_at,
           updated_at
         ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $6, NOW(), NOW())
         RETURNING id`,
        [
          `CBIS-UNPROVEN-${suffix}`,
          contactId,
          caseTypeId,
          'Unproven null-account case',
          activeStatusId,
          userId,
        ]
      )
    ).rows[0].id;
    createdCaseIds.push(caseId);

    await withAuth(request(app)
      .get(`/api/v2/cases/${caseId}`))
      .expect(404);

    const listResponse = await withAuth(request(app)
      .get('/api/v2/cases')
      .query({ contact_id: contactId }))
      .expect(200);
    const listPayload = payloadFromResponse<{ cases: Array<{ id: string }> }>(listResponse.body);
    expect(listPayload.cases.map((item) => item.id)).not.toContain(caseId);
  });

  it('creates, lists, and updates case reassessment cycles with linked follow-ups', async () => {
    const contactId = await createContact(organizationId);
    const createdCase = await createCaseWithoutAccount(
      contactId,
      `Reassessment lifecycle ${unique()}`
    );

    const createResponse = await withAuth(
      request(app)
        .post(`/api/v2/cases/${createdCase.id}/reassessments`)
        .send({
          title: 'Quarterly reassessment',
          summary: 'Review housing stability and benefits status',
          earliest_review_date: '2032-01-01',
          due_date: '2032-01-15',
          latest_review_date: '2032-01-31',
          owner_user_id: userId,
        })
    ).expect(201);

    const created = payloadFromResponse<{
      id: string;
      follow_up_id: string;
      title: string;
      due_date: string;
    }>(createResponse.body);

    expect(created.title).toBe('Quarterly reassessment');
    expect(created.due_date).toBe('2032-01-15');
    expect(created.follow_up_id).toBeTruthy();

    const linkedFollowUp = await pool.query<{
      title: string;
      entity_type: string;
      entity_id: string;
      frequency: string;
      scheduled_date: string;
      assigned_to: string | null;
    }>(
      `SELECT title, entity_type, entity_id, frequency, scheduled_date::text AS scheduled_date, assigned_to
       FROM follow_ups
       WHERE id = $1`,
      [created.follow_up_id]
    );

    expect(linkedFollowUp.rows[0]).toEqual(
      expect.objectContaining({
        title: 'Quarterly reassessment',
        entity_type: 'case',
        entity_id: createdCase.id,
        frequency: 'once',
        scheduled_date: '2032-01-15',
        assigned_to: userId,
      })
    );

    const listResponse = await withAuth(
      request(app).get(`/api/v2/cases/${createdCase.id}/reassessments`)
    ).expect(200);
    const listed = payloadFromResponse<Array<{ id: string }>>(listResponse.body);
    expect(listed.map((item) => item.id)).toContain(created.id);

    const updateResponse = await withAuth(
      request(app)
        .patch(`/api/v2/cases/${createdCase.id}/reassessments/${created.id}`)
        .send({
          title: 'Updated reassessment',
          status: 'in_progress',
          due_date: '2032-02-01',
          latest_review_date: '2032-02-15',
          summary: null,
        })
    ).expect(200);

    const updated = payloadFromResponse<{
      title: string;
      status: string;
      due_date: string;
      summary: string | null;
    }>(updateResponse.body);
    expect(updated).toEqual(
      expect.objectContaining({
        title: 'Updated reassessment',
        status: 'in_progress',
        due_date: '2032-02-01',
        summary: null,
      })
    );
  });

  it('enforces reassessment organization scope and outcome-backed completion', async () => {
    const contactId = await createContact(organizationId);
    const createdCase = await createCaseWithoutAccount(
      contactId,
      `Reassessment completion ${unique()}`
    );

    const createResponse = await withAuth(
      request(app)
        .post(`/api/v2/cases/${createdCase.id}/reassessments`)
        .send({
          title: 'Benefits reassessment',
          due_date: '2032-03-15',
        })
    ).expect(201);
    const created = payloadFromResponse<{ id: string; follow_up_id: string }>(createResponse.body);

    await request(app)
      .get(`/api/v2/cases/${createdCase.id}/reassessments`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', '11111111-1111-4111-8111-111111111111')
      .expect(404);

    const invalidCompletion = await withAuth(
      request(app)
        .post(`/api/v2/cases/${createdCase.id}/reassessments/${created.id}/complete`)
        .send({
          completion_summary: 'Reviewed without an outcome',
        })
    ).expect(400);
    expect(invalidCompletion.body.error.message).toBe(
      'Case reassessment completion requires at least one outcome definition'
    );

    const completeResponse = await withAuth(
      request(app)
        .post(`/api/v2/cases/${createdCase.id}/reassessments/${created.id}/complete`)
        .send({
          completion_summary: 'Reviewed stability plan and confirmed next check-in',
          outcome_definition_ids: [outcomeDefinitionId],
          outcome_visibility: false,
          next_due_date: '2032-06-15',
          next_title: 'Next reassessment',
        })
    ).expect(200);

    const completed = payloadFromResponse<{
      reassessment: { status: string; completion_summary: string | null };
      next_reassessment: { id: string; follow_up_id: string; due_date: string } | null;
    }>(completeResponse.body);

    expect(completed.reassessment).toEqual(
      expect.objectContaining({
        status: 'completed',
        completion_summary: 'Reviewed stability plan and confirmed next check-in',
      })
    );
    expect(completed.next_reassessment).toEqual(
      expect.objectContaining({
        due_date: '2032-06-15',
      })
    );

    const linkedFollowUp = await pool.query<{ status: string; completed_notes: string | null }>(
      'SELECT status, completed_notes FROM follow_ups WHERE id = $1',
      [created.follow_up_id]
    );
    expect(linkedFollowUp.rows[0]).toEqual(
      expect.objectContaining({
        status: 'completed',
        completed_notes: 'Reviewed stability plan and confirmed next check-in',
      })
    );

    const outcomeRows = await pool.query<{ id: string }>(
      `SELECT id
       FROM case_outcomes
       WHERE case_id = $1
         AND source_entity_id = $2`,
      [createdCase.id, created.follow_up_id]
    );
    expect(outcomeRows.rowCount).toBeGreaterThanOrEqual(1);
  });

  it('cancels a case reassessment cycle and linked follow-up', async () => {
    const contactId = await createContact(organizationId);
    const createdCase = await createCaseWithoutAccount(
      contactId,
      `Reassessment cancel ${unique()}`
    );

    const createResponse = await withAuth(
      request(app)
        .post(`/api/v2/cases/${createdCase.id}/reassessments`)
        .send({
          title: 'Closure review',
          due_date: '2032-04-15',
        })
    ).expect(201);
    const created = payloadFromResponse<{ id: string; follow_up_id: string }>(createResponse.body);

    const cancelResponse = await withAuth(
      request(app)
        .post(`/api/v2/cases/${createdCase.id}/reassessments/${created.id}/cancel`)
        .send({
          cancellation_reason: 'Case closed before review window',
        })
    ).expect(200);

    const cancelled = payloadFromResponse<{
      status: string;
      cancellation_reason: string | null;
    }>(cancelResponse.body);
    expect(cancelled).toEqual(
      expect.objectContaining({
        status: 'cancelled',
        cancellation_reason: 'Case closed before review window',
      })
    );

    const linkedFollowUp = await pool.query<{ status: string; completed_notes: string | null }>(
      'SELECT status, completed_notes FROM follow_ups WHERE id = $1',
      [created.follow_up_id]
    );
    expect(linkedFollowUp.rows[0]).toEqual(
      expect.objectContaining({
        status: 'cancelled',
        completed_notes: 'Case closed before review window',
      })
    );
  });
});
