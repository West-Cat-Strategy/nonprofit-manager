import request, { type Test } from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

type FollowUpRecord = {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  method: string | null;
  status: string;
  assigned_to: string | null;
  completed_notes: string | null;
  completed_date: string | null;
};

describe('Follow-up API Integration Tests', () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const createdUserIds: string[] = [];
  const createdAccountIds: string[] = [];
  const createdContactIds: string[] = [];
  const createdCaseTypeIds: string[] = [];
  const createdCaseStatusIds: string[] = [];
  const createdCaseIds: string[] = [];
  const createdFollowUpIds: string[] = [];

  let organizationId = '';
  let staffUserId = '';
  let staffEmail = '';
  let viewerUserId = '';
  let viewerEmail = '';
  let staffToken = '';
  let viewerToken = '';
  let contactId = '';
  let caseTypeId = '';
  let caseStatusId = '';
  let caseId = '';

  const unwrap = <T>(body: unknown): T => {
    if (typeof body === 'object' && body !== null && 'data' in body) {
      const envelope = body as { data?: T };
      if (envelope.data !== undefined) {
        return envelope.data;
      }
    }

    return body as T;
  };

  const buildToken = (userId: string, email: string, role: string): string =>
    jwt.sign(
      {
        id: userId,
        email,
        role,
        organizationId,
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

  const withOrgAuth = (token: string, req: Test): Test =>
    req.set('Authorization', `Bearer ${token}`).set('X-Organization-Id', organizationId);

  const expectCanonicalError = (
    response: { body: { success?: boolean; error?: { code?: string } } },
    code: string
  ): void => {
    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe(code);
  };

  const loadFollowUp = async (followUpId: string): Promise<FollowUpRecord> => {
    const result = await pool.query<FollowUpRecord>(
      `SELECT
         id,
         title,
         description,
         scheduled_date::text AS scheduled_date,
         to_char(scheduled_time, 'HH24:MI') AS scheduled_time,
         method,
         status,
         assigned_to,
         completed_notes,
         completed_date::text AS completed_date
       FROM follow_ups
       WHERE id = $1`,
      [followUpId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Follow-up ${followUpId} was not found`);
    }

    return row;
  };

  const createSeedFollowUp = async (input?: {
    entityType?: 'contact' | 'case';
    entityId?: string;
    title?: string;
    description?: string | null;
    scheduledDate?: string;
    scheduledTime?: string | null;
    status?: 'scheduled' | 'completed' | 'cancelled';
    assignedTo?: string | null;
  }): Promise<string> => {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO follow_ups (
         organization_id,
         entity_type,
         entity_id,
         title,
         description,
         scheduled_date,
         scheduled_time,
         frequency,
         status,
         assigned_to,
         reminder_minutes_before,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'once', $8, $9, NULL, $10, $10)
       RETURNING id`,
      [
        organizationId,
        input?.entityType || 'contact',
        input?.entityId || contactId,
        input?.title || `Seeded follow-up ${suffix}`,
        input?.description ?? null,
        input?.scheduledDate || '2032-04-18',
        input?.scheduledTime || null,
        input?.status || 'scheduled',
        input?.assignedTo ?? staffUserId,
        staffUserId,
      ]
    );

    const followUpId = result.rows[0].id;
    createdFollowUpIds.push(followUpId);
    return followUpId;
  };

  beforeAll(async () => {
    const passwordHash = '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG';

    staffEmail = `followups-staff-${suffix}@example.com`;
    const staffResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, 'FollowUp', 'Staff', 'staff', true, NOW(), NOW())
       RETURNING id`,
      [staffEmail, passwordHash]
    );
    staffUserId = staffResult.rows[0].id;
    createdUserIds.push(staffUserId);

    viewerEmail = `followups-viewer-${suffix}@example.com`;
    const viewerResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, 'FollowUp', 'Viewer', 'viewer', true, NOW(), NOW())
       RETURNING id`,
      [viewerEmail, passwordHash]
    );
    viewerUserId = viewerResult.rows[0].id;
    createdUserIds.push(viewerUserId);

    const accountResult = await pool.query<{ id: string }>(
      `INSERT INTO accounts (account_name, account_type, is_active, created_by, modified_by, created_at, updated_at)
       VALUES ($1, 'organization', true, $2, $2, NOW(), NOW())
       RETURNING id`,
      [`Follow-up Test Org ${suffix}`, staffUserId]
    );
    organizationId = accountResult.rows[0].id;
    createdAccountIds.push(organizationId);

    await pool.query(
      `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
       VALUES
         ($1, $3, 'staff', $1, true),
         ($2, $3, 'viewer', $1, true)
       ON CONFLICT (user_id, account_id)
       DO UPDATE SET
         access_level = EXCLUDED.access_level,
         granted_by = EXCLUDED.granted_by,
         is_active = true`,
      [staffUserId, viewerUserId, organizationId]
    );

    staffToken = buildToken(staffUserId, staffEmail, 'staff');
    viewerToken = buildToken(viewerUserId, viewerEmail, 'viewer');

    const contactResult = await pool.query<{ id: string }>(
      `INSERT INTO contacts (first_name, last_name, email, account_id, created_by, modified_by)
       VALUES ('Follow', 'Target', $1, $2, $3, $3)
       RETURNING id`,
      [`followups-contact-${suffix}@example.com`, organizationId, staffUserId]
    );
    contactId = contactResult.rows[0].id;
    createdContactIds.push(contactId);

    const caseTypeResult = await pool.query<{ id: string }>(
      `INSERT INTO case_types (name, description, created_at, updated_at)
       VALUES ($1, 'Follow-up test case type', NOW(), NOW())
       RETURNING id`,
      [`Follow-up Case Type ${suffix}`]
    );
    caseTypeId = caseTypeResult.rows[0].id;
    createdCaseTypeIds.push(caseTypeId);

    const caseStatusResult = await pool.query<{ id: string }>(
      `INSERT INTO case_statuses (name, status_type, sort_order, is_active, created_at, updated_at)
       VALUES ($1, 'active', 10, true, NOW(), NOW())
       RETURNING id`,
      [`Follow-up Case Status ${suffix}`]
    );
    caseStatusId = caseStatusResult.rows[0].id;
    createdCaseStatusIds.push(caseStatusId);

    const caseResult = await pool.query<{ id: string }>(
      `INSERT INTO cases (
         case_number,
         contact_id,
         account_id,
         case_type_id,
         status_id,
         title,
         client_viewable,
         assigned_to,
         created_by,
         modified_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, false, $7, $7, $7, NOW(), NOW())
       RETURNING id`,
      [
        `CASE-FU-${suffix}`,
        contactId,
        organizationId,
        caseTypeId,
        caseStatusId,
        'Follow-up Test Case',
        staffUserId,
      ]
    );
    caseId = caseResult.rows[0].id;
    createdCaseIds.push(caseId);
  });

  afterAll(async () => {
    if (createdFollowUpIds.length > 0) {
      await pool.query('DELETE FROM follow_up_notifications WHERE follow_up_id = ANY($1::uuid[])', [
        createdFollowUpIds,
      ]);
      await pool.query('DELETE FROM follow_ups WHERE id = ANY($1::uuid[])', [createdFollowUpIds]);
    }

    if (createdCaseIds.length > 0) {
      await pool.query('DELETE FROM case_outcomes WHERE case_id = ANY($1::uuid[])', [
        createdCaseIds,
      ]);
      await pool.query('DELETE FROM case_notes WHERE case_id = ANY($1::uuid[])', [createdCaseIds]);
      await pool.query('DELETE FROM cases WHERE id = ANY($1::uuid[])', [createdCaseIds]);
    }

    if (createdContactIds.length > 0) {
      await pool.query('DELETE FROM contacts WHERE id = ANY($1::uuid[])', [createdContactIds]);
    }

    if (organizationId) {
      await pool.query('DELETE FROM user_account_access WHERE account_id = $1', [organizationId]);
    }

    if (createdAccountIds.length > 0) {
      await pool.query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [createdAccountIds]);
    }

    if (createdCaseStatusIds.length > 0) {
      await pool.query('DELETE FROM case_statuses WHERE id = ANY($1::uuid[])', [
        createdCaseStatusIds,
      ]);
    }

    if (createdCaseTypeIds.length > 0) {
      await pool.query('DELETE FROM case_types WHERE id = ANY($1::uuid[])', [createdCaseTypeIds]);
    }

    if (createdUserIds.length > 0) {
      try {
        await pool.query('DELETE FROM user_roles WHERE user_id = ANY($1::uuid[])', [
          createdUserIds,
        ]);
      } catch {
        // Ignore when optional auth tables are absent.
      }
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
    }
  });

  it('creates, updates, and reschedules a contact follow-up with persisted changes', async () => {
    const createResponse = await withOrgAuth(
      staffToken,
      request(app).post('/api/v2/follow-ups').send({
        entity_type: 'contact',
        entity_id: contactId,
        title: 'Initial follow-up',
        description: 'Initial notes',
        scheduled_date: '2032-05-01',
        scheduled_time: '14:30',
        method: 'phone',
        assigned_to: staffUserId,
      })
    ).expect(201);

    expect(createResponse.body.success).toBe(true);
    const created = unwrap<{
      id: string;
      title: string;
      scheduled_date: string;
      scheduled_time: string | null;
    }>(createResponse.body);
    createdFollowUpIds.push(created.id);
    expect(created.title).toBe('Initial follow-up');
    expect(created.scheduled_date).toBe('2032-05-01');
    expect(created.scheduled_time).toBe('14:30');

    const createdRow = await loadFollowUp(created.id);
    expect(createdRow.title).toBe('Initial follow-up');
    expect(createdRow.description).toBe('Initial notes');
    expect(createdRow.scheduled_date).toBe('2032-05-01');
    expect(createdRow.scheduled_time).toBe('14:30');
    expect(createdRow.method).toBe('phone');
    expect(createdRow.assigned_to).toBe(staffUserId);

    const updateResponse = await withOrgAuth(
      staffToken,
      request(app).put(`/api/v2/follow-ups/${created.id}`).send({
        title: 'Updated follow-up',
        description: null,
        scheduled_date: '2032-05-02',
        scheduled_time: '09:45',
        method: 'email',
        assigned_to: null,
      })
    ).expect(200);

    expect(updateResponse.body.success).toBe(true);
    const updated = unwrap<{ title: string; description: string | null; method: string | null }>(
      updateResponse.body
    );
    expect(updated.title).toBe('Updated follow-up');
    expect(updated.description).toBeNull();
    expect(updated.method).toBe('email');

    const updatedRow = await loadFollowUp(created.id);
    expect(updatedRow.title).toBe('Updated follow-up');
    expect(updatedRow.description).toBeNull();
    expect(updatedRow.scheduled_date).toBe('2032-05-02');
    expect(updatedRow.scheduled_time).toBe('09:45');
    expect(updatedRow.method).toBe('email');
    expect(updatedRow.assigned_to).toBeNull();

    const rescheduleResponse = await withOrgAuth(
      staffToken,
      request(app).post(`/api/v2/follow-ups/${created.id}/reschedule`).send({
        scheduled_date: '2032-06-01',
        scheduled_time: '11:15',
      })
    ).expect(200);

    expect(rescheduleResponse.body.success).toBe(true);
    const rescheduled = unwrap<{
      scheduled_date: string;
      scheduled_time: string | null;
      status: string;
    }>(rescheduleResponse.body);
    expect(rescheduled.scheduled_date).toBe('2032-06-01');
    expect(rescheduled.scheduled_time).toBe('11:15');
    expect(rescheduled.status).toBe('scheduled');

    const rescheduledRow = await loadFollowUp(created.id);
    expect(rescheduledRow.scheduled_date).toBe('2032-06-01');
    expect(rescheduledRow.scheduled_time).toBe('11:15');
    expect(rescheduledRow.status).toBe('scheduled');
    expect(rescheduledRow.completed_notes).toBeNull();
    expect(rescheduledRow.completed_date).toBeNull();
  });

  it('completes a contact follow-up and persists completion details', async () => {
    const followUpId = await createSeedFollowUp({
      entityType: 'contact',
      entityId: contactId,
      title: 'Completion target',
      scheduledDate: '2032-05-10',
    });

    const response = await withOrgAuth(
      staffToken,
      request(app).post(`/api/v2/follow-ups/${followUpId}/complete`).send({
        completed_notes: 'Completed by phone',
      })
    ).expect(200);

    expect(response.body.success).toBe(true);
    const completed = unwrap<{ status: string; completed_notes: string | null }>(response.body);
    expect(completed.status).toBe('completed');
    expect(completed.completed_notes).toBe('Completed by phone');

    const row = await loadFollowUp(followUpId);
    expect(row.status).toBe('completed');
    expect(row.completed_notes).toBe('Completed by phone');
    expect(row.completed_date).toBeTruthy();
  });

  it('cancels a contact follow-up and persists cancellation details', async () => {
    const followUpId = await createSeedFollowUp({
      entityType: 'contact',
      entityId: contactId,
      title: 'Cancellation target',
      scheduledDate: '2032-05-11',
    });

    const response = await withOrgAuth(
      staffToken,
      request(app).post(`/api/v2/follow-ups/${followUpId}/cancel`).send({
        completed_notes: 'Cancelled after client declined',
      })
    ).expect(200);

    expect(response.body.success).toBe(true);
    const cancelled = unwrap<{ status: string; completed_notes: string | null }>(response.body);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.completed_notes).toBe('Cancelled after client declined');

    const row = await loadFollowUp(followUpId);
    expect(row.status).toBe('cancelled');
    expect(row.completed_notes).toBe('Cancelled after client declined');
  });

  it.each([
    {
      name: 'create',
      method: 'post' as const,
      path: () => '/api/v2/follow-ups',
      payload: {
        entity_type: 'contact',
        entity_id: contactId,
        title: 'Viewer create attempt',
        scheduled_date: '2032-07-01',
      },
    },
    {
      name: 'update',
      method: 'put' as const,
      path: (id: string) => `/api/v2/follow-ups/${id}`,
      payload: {
        title: 'Viewer update attempt',
      },
    },
    {
      name: 'complete',
      method: 'post' as const,
      path: (id: string) => `/api/v2/follow-ups/${id}/complete`,
      payload: {
        completed_notes: 'Viewer complete attempt',
      },
    },
    {
      name: 'cancel',
      method: 'post' as const,
      path: (id: string) => `/api/v2/follow-ups/${id}/cancel`,
      payload: {
        completed_notes: 'Viewer cancel attempt',
      },
    },
    {
      name: 'reschedule',
      method: 'post' as const,
      path: (id: string) => `/api/v2/follow-ups/${id}/reschedule`,
      payload: {
        scheduled_date: '2032-07-02',
        scheduled_time: '10:30',
      },
    },
  ])('returns forbidden for viewer-role $name requests', async ({ method, path, payload }) => {
    const protectedFollowUpId = await createSeedFollowUp({
      entityType: 'contact',
      entityId: contactId,
      title: 'Protected follow-up',
      scheduledDate: '2032-07-01',
    });

    const req = request(app)[method](path(protectedFollowUpId));
    const response = await withOrgAuth(viewerToken, req.send(payload)).expect(403);

    expectCanonicalError(response, 'forbidden');
  });

  it('rejects invalid create payloads with the validation envelope', async () => {
    const response = await withOrgAuth(
      staffToken,
      request(app).post('/api/v2/follow-ups').send({
        entity_type: 'contact',
        entity_id: contactId,
        title: '',
        scheduled_date: 'not-a-date',
      })
    ).expect(400);

    expectCanonicalError(response, 'validation_error');
    expect(response.body.error.details.validation.body.title).toBeDefined();
    expect(response.body.error.details.validation.body.scheduled_date).toBeDefined();
  });

  it('rejects invalid update payloads with the validation envelope', async () => {
    const followUpId = await createSeedFollowUp({
      entityType: 'contact',
      entityId: contactId,
      title: 'Invalid update target',
    });

    const response = await withOrgAuth(
      staffToken,
      request(app).put(`/api/v2/follow-ups/${followUpId}`).send({
        scheduled_time: '9am',
      })
    ).expect(400);

    expectCanonicalError(response, 'validation_error');
    expect(response.body.error.details.validation.body.scheduled_time).toBeDefined();
  });

  it('rejects invalid reschedule payloads with the validation envelope', async () => {
    const followUpId = await createSeedFollowUp({
      entityType: 'contact',
      entityId: contactId,
      title: 'Invalid reschedule target',
    });

    const response = await withOrgAuth(
      staffToken,
      request(app).post(`/api/v2/follow-ups/${followUpId}/reschedule`).send({
        scheduled_date: 'tomorrow',
        scheduled_time: '9am',
      })
    ).expect(400);

    expectCanonicalError(response, 'validation_error');
    expect(response.body.error.details.validation.body.scheduled_date).toBeDefined();
    expect(response.body.error.details.validation.body.scheduled_time).toBeDefined();
  });

  it('surfaces case outcome validation as a bad request when completing a case follow-up', async () => {
    const followUpId = await createSeedFollowUp({
      entityType: 'case',
      entityId: caseId,
      title: 'Case completion validation target',
      scheduledDate: '2032-08-01',
    });

    const response = await withOrgAuth(
      staffToken,
      request(app).post(`/api/v2/follow-ups/${followUpId}/complete`).send({
        completed_notes: 'Tried to complete without outcomes',
      })
    ).expect(400);

    expectCanonicalError(response, 'bad_request');
    expect(response.body.error.message).toBe(
      'Case follow-ups require at least one outcome definition'
    );

    const row = await loadFollowUp(followUpId);
    expect(row.status).toBe('scheduled');
    expect(row.completed_notes).toBeNull();
  });

  it('surfaces case outcome validation as a bad request when cancelling a case follow-up', async () => {
    const followUpId = await createSeedFollowUp({
      entityType: 'case',
      entityId: caseId,
      title: 'Case cancellation validation target',
      scheduledDate: '2032-08-02',
    });

    const response = await withOrgAuth(
      staffToken,
      request(app).post(`/api/v2/follow-ups/${followUpId}/cancel`).send({
        completed_notes: 'Tried to cancel without outcomes',
      })
    ).expect(400);

    expectCanonicalError(response, 'bad_request');
    expect(response.body.error.message).toBe(
      'Case follow-ups require at least one outcome definition'
    );

    const row = await loadFollowUp(followUpId);
    expect(row.status).toBe('scheduled');
    expect(row.completed_notes).toBeNull();
  });
});
