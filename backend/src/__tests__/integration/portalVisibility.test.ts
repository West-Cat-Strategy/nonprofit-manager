import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Portal Visibility Integration', () => {
  type PortalPagedPayload<T> = {
    items: T[];
    page: {
      limit: number;
      offset: number;
      has_more: boolean;
      total: number;
    };
  };

  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let contactId: string;
  let portalUserId: string;
  let portalEmail: string;
  let visibleNoteId: string;
  let hiddenNoteId: string;
  let internalVisibleNoteId: string;
  let visibleDocId: string;
  let hiddenDocId: string;
  let visibleFormDocId: string;
  let missingFileDocId: string;
  let portalEventId: string;
  let portalRegistrationId: string;
  let portalCheckInToken: string;
  let organizationId: string;
  let adminUserId: string;
  let caseTypeId: string;
  let activeStatusId: string;
  let portalCaseId: string;
  let activeAssignmentId: string;
  let reviewedAssignmentId: string;

  const createdDocIds: string[] = [];
  const createdNoteIds: string[] = [];
  const createdPortalUserIds: string[] = [];
  const createdContactIds: string[] = [];
  const createdCaseIds: string[] = [];
  const createdAssignmentIds: string[] = [];
  const createdSubmissionIds: string[] = [];
  const createdEventIds: string[] = [];
  const createdOccurrenceIds: string[] = [];
  const createdRegistrationIds: string[] = [];
  const createdStatusIds: string[] = [];
  const createdCaseTypeIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildPortalToken = () =>
    jwt.sign(
      { id: portalUserId, email: portalEmail, contactId, type: 'portal' as const },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

  beforeAll(async () => {
    const suffix = unique();

    const adminEmail = `portal-visibility-admin-${suffix}@example.com`;
    const adminUserResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Portal', 'Admin', 'admin', NOW(), NOW())
       RETURNING id`,
      [adminEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    adminUserId = adminUserResult.rows[0].id as string;
    createdUserIds.push(adminUserId);

    const orgResult = await pool.query(
      "INSERT INTO accounts (account_name, account_type, created_at, updated_at) VALUES ($1, 'organization', NOW(), NOW()) RETURNING id",
      [`Portal Visibility Org ${suffix}`]
    );
    organizationId = orgResult.rows[0].id;

    const caseTypeResult = await pool.query(
      `INSERT INTO case_types (name, description, created_at, updated_at)
       VALUES ($1, 'Portal visibility type', NOW(), NOW())
       RETURNING id`,
      [`Portal Visibility Type ${suffix}`]
    );
    caseTypeId = caseTypeResult.rows[0].id as string;
    createdCaseTypeIds.push(caseTypeId);

    const statusResult = await pool.query(
      `INSERT INTO case_statuses (name, status_type, sort_order, is_active, created_at, updated_at)
       VALUES ($1, 'active', 10, true, NOW(), NOW())
       RETURNING id`,
      [`Portal Visibility Active ${suffix}`]
    );
    activeStatusId = statusResult.rows[0].id as string;
    createdStatusIds.push(activeStatusId);

    portalEmail = `portal-visibility-${suffix}@example.com`;
    const contactResult = await pool.query(
      `INSERT INTO contacts (account_id, first_name, last_name, email, created_by, modified_by)
       VALUES ($1, 'Portal', 'Visibility', $2, NULL, NULL)
       RETURNING id`,
      [organizationId, portalEmail]
    );
    contactId = contactResult.rows[0].id as string;
    createdContactIds.push(contactId);

    const portalUserResult = await pool.query(
      `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
       VALUES ($1, $2, $3, 'active', true)
       RETURNING id`,
      [contactId, portalEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    portalUserId = portalUserResult.rows[0].id as string;
    createdPortalUserIds.push(portalUserId);

    const hiddenNote = await pool.query(
      `INSERT INTO contact_notes (
         contact_id,
         note_type,
         subject,
         content,
         is_internal,
         is_portal_visible,
         created_by
       ) VALUES ($1, 'note', 'Hidden note', 'Hidden note content', false, false, NULL)
       RETURNING id`,
      [contactId]
    );
    hiddenNoteId = hiddenNote.rows[0].id as string;
    createdNoteIds.push(hiddenNoteId);

    const internalVisibleNote = await pool.query(
      `INSERT INTO contact_notes (
         contact_id,
         note_type,
         subject,
         content,
         is_internal,
         is_portal_visible,
         created_by
       ) VALUES ($1, 'note', 'Internal note', 'Should not appear in portal', true, true, NULL)
       RETURNING id`,
      [contactId]
    );
    internalVisibleNoteId = internalVisibleNote.rows[0].id as string;
    createdNoteIds.push(internalVisibleNoteId);

    const visibleNote = await pool.query(
      `INSERT INTO contact_notes (
         contact_id,
         note_type,
         subject,
         content,
         is_internal,
         is_portal_visible,
         created_by
       ) VALUES ($1, 'note', 'Visible note', 'Visible portal note', false, true, NULL)
       RETURNING id`,
      [contactId]
    );
    visibleNoteId = visibleNote.rows[0].id as string;
    createdNoteIds.push(visibleNoteId);

    const hiddenDoc = await pool.query(
      `INSERT INTO contact_documents (
         contact_id,
         file_name,
         original_name,
         file_path,
         file_size,
         mime_type,
         document_type,
         title,
         is_portal_visible,
         created_by
       ) VALUES ($1, 'hidden.pdf', 'hidden.pdf', 'documents/test-hidden.pdf', 12, 'application/pdf', 'other', 'Hidden document', false, NULL)
       RETURNING id`,
      [contactId]
    );
    hiddenDocId = hiddenDoc.rows[0].id as string;
    createdDocIds.push(hiddenDocId);

    const visibleDoc = await pool.query(
      `INSERT INTO contact_documents (
         contact_id,
         file_name,
         original_name,
         file_path,
         file_size,
         mime_type,
         document_type,
         title,
         is_portal_visible,
         created_by
       ) VALUES ($1, 'visible.pdf', 'visible.pdf', 'documents/test-visible.pdf', 18, 'application/pdf', 'other', 'Visible document', true, NULL)
       RETURNING id`,
      [contactId]
    );
    visibleDocId = visibleDoc.rows[0].id as string;
    createdDocIds.push(visibleDocId);

    const visibleFormDoc = await pool.query(
      `INSERT INTO contact_documents (
         contact_id,
         file_name,
         original_name,
         file_path,
         file_size,
         mime_type,
         document_type,
         title,
         is_portal_visible,
         created_by
       ) VALUES ($1, 'consent.pdf', 'consent.pdf', 'documents/test-consent.pdf', 25, 'application/pdf', 'consent_form', 'Visible consent form', true, NULL)
       RETURNING id`,
      [contactId]
    );
    visibleFormDocId = visibleFormDoc.rows[0].id as string;
    createdDocIds.push(visibleFormDocId);

    const missingFileDoc = await pool.query(
      `INSERT INTO contact_documents (
         contact_id,
         file_name,
         original_name,
         file_path,
         file_size,
         mime_type,
         document_type,
         title,
         is_portal_visible,
         created_by
       ) VALUES ($1, 'missing.pdf', 'missing.pdf', $2, 99, 'application/pdf', 'other', 'Missing file document', true, NULL)
       RETURNING id`,
      [contactId, `documents/non-existent-${suffix}.pdf`]
    );
    missingFileDocId = missingFileDoc.rows[0].id as string;
    createdDocIds.push(missingFileDocId);

    const portalEvent = await pool.query(
      `INSERT INTO events (
         organization_id,
         name,
         description,
         event_type,
         status,
         is_public,
         start_date,
         end_date,
         location_name,
         created_by,
         modified_by
       ) VALUES (
         $1,
         'Portal Registration Event',
         'Visible via registration',
         'community',
         'planned',
         false,
         NOW() + interval '2 days',
         NOW() + interval '2 days 2 hours',
         'Portal Hall',
         NULL,
         NULL
       )
       RETURNING id`,
       [organizationId]
    );
    portalEventId = portalEvent.rows[0].id as string;
    createdEventIds.push(portalEventId);

    const portalOccurrence = await pool.query(
      `INSERT INTO event_occurrences (
         organization_id, 
         event_id, 
         start_date, 
         end_date, 
         scheduled_start_date, 
         scheduled_end_date, 
         event_name,
         status
       )
       VALUES ($1, $2, NOW() + interval '2 days', NOW() + interval '2 days 2 hours', NOW() + interval '2 days', NOW() + interval '2 days 2 hours', 'Portal Event', 'planned')
       RETURNING id`,
      [organizationId, portalEventId]
    );
    const portalOccurrenceId = portalOccurrence.rows[0].id as string;
    createdOccurrenceIds.push(portalOccurrenceId);

    const portalRegistration = await pool.query<{ id: string; check_in_token: string }>(
      `INSERT INTO event_registrations (
         event_id,
         occurrence_id,
         contact_id,
         registration_status,
         checked_in,
         check_in_time,
         check_in_method
       ) VALUES ($1, $2, $3, 'registered', true, NOW(), 'qr')
       RETURNING id, check_in_token`,
      [portalEventId, portalOccurrenceId, contactId]
    );
    portalRegistrationId = portalRegistration.rows[0].id as string;
    portalCheckInToken = portalRegistration.rows[0].check_in_token;
    createdRegistrationIds.push(portalRegistrationId);

    const portalCase = await pool.query(
      `INSERT INTO cases (
         account_id,
         case_number,
         contact_id,
         case_type_id,
         status_id,
         title,
         description,
         client_viewable,
         assigned_to,
         created_by,
         modified_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $8, $8, NOW(), NOW())
       RETURNING id`,
      [
        organizationId,
        `PORTAL-FORMS-${suffix}`,
        contactId,
        caseTypeId,
        activeStatusId,
        'Portal Forms Case',
        'Assignment-backed portal forms integration coverage',
        adminUserId,
      ]
    );
    portalCaseId = portalCase.rows[0].id as string;
    createdCaseIds.push(portalCaseId);

    const schema = {
      version: 1,
      title: 'Portal Forms Fixture',
      sections: [
        {
          id: 'section-1',
          title: 'Details',
          questions: [
            {
              id: 'question-notes',
              key: 'notes',
              type: 'textarea',
              label: 'Notes',
              required: true,
            },
          ],
        },
      ],
    };

    const activeAssignment = await pool.query(
      `INSERT INTO case_form_assignments (
         case_id,
         contact_id,
         account_id,
         title,
         description,
         status,
         schema,
         current_draft_answers,
         due_at,
         delivery_target,
         sent_at,
         created_by,
         updated_by
       ) VALUES ($1, $2, $3, $4, $5, 'sent', $6::jsonb, '{}'::jsonb, NOW() + interval '5 days', 'portal', NOW(), $7, $7)
       RETURNING id`,
      [
        portalCaseId,
        contactId,
        organizationId,
        'Active Portal Intake Form',
        'Needs a current response',
        JSON.stringify(schema),
        adminUserId,
      ]
    );
    activeAssignmentId = activeAssignment.rows[0].id as string;
    createdAssignmentIds.push(activeAssignmentId);

    const reviewedAssignment = await pool.query(
      `INSERT INTO case_form_assignments (
         case_id,
         contact_id,
         account_id,
         title,
         description,
         status,
         schema,
         current_draft_answers,
         delivery_target,
         sent_at,
         submitted_at,
         reviewed_at,
         created_by,
         updated_by
       ) VALUES ($1, $2, $3, $4, $5, 'reviewed', $6::jsonb, $7::jsonb, 'portal', NOW() - interval '3 days', NOW() - interval '2 days', NOW() - interval '1 day', $8, $8)
       RETURNING id`,
      [
        portalCaseId,
        contactId,
        organizationId,
        'Reviewed Consent Form',
        'Already reviewed',
        JSON.stringify(schema),
        JSON.stringify({ notes: 'Reviewed portal response' }),
        adminUserId,
      ]
    );
    reviewedAssignmentId = reviewedAssignment.rows[0].id as string;
    createdAssignmentIds.push(reviewedAssignmentId);

    const reviewedSubmission = await pool.query(
      `INSERT INTO case_form_submissions (
         assignment_id,
         case_id,
         contact_id,
         submission_number,
         answers,
         mapping_audit,
         response_packet_file_name,
         response_packet_file_path,
         submitted_by_actor_type,
         submitted_by_portal_user_id
       ) VALUES ($1, $2, $3, 1, $4::jsonb, '[]'::jsonb, $5, $6, 'portal', $7)
       RETURNING id`,
      [
        reviewedAssignmentId,
        portalCaseId,
        contactId,
        JSON.stringify({ notes: 'Reviewed portal response' }),
        'portal-reviewed-packet.pdf',
        `case-forms/portal-reviewed-packet-${suffix}.pdf`,
        portalUserId,
      ]
    );
    createdSubmissionIds.push(reviewedSubmission.rows[0].id as string);
  });

  afterAll(async () => {
    if (createdSubmissionIds.length > 0) {
      await pool.query('DELETE FROM case_form_submissions WHERE id = ANY($1)', [createdSubmissionIds]);
    }
    if (createdAssignmentIds.length > 0) {
      await pool.query('DELETE FROM case_form_assignments WHERE id = ANY($1)', [createdAssignmentIds]);
    }
    if (createdCaseIds.length > 0) {
      await pool.query('DELETE FROM cases WHERE id = ANY($1)', [createdCaseIds]);
    }
    if (createdRegistrationIds.length > 0) {
      await pool.query('DELETE FROM event_registrations WHERE id = ANY($1)', [createdRegistrationIds]);
    }
    if (createdOccurrenceIds.length > 0) {
      await pool.query('DELETE FROM event_occurrences WHERE id = ANY($1)', [createdOccurrenceIds]);
    }
    if (createdEventIds.length > 0) {
      await pool.query('DELETE FROM events WHERE id = ANY($1)', [createdEventIds]);
    }
    if (createdDocIds.length > 0) {
      await pool.query('DELETE FROM contact_documents WHERE id = ANY($1)', [createdDocIds]);
    }
    if (createdNoteIds.length > 0) {
      await pool.query('DELETE FROM contact_notes WHERE id = ANY($1)', [createdNoteIds]);
    }
    if (createdPortalUserIds.length > 0) {
      await pool.query('DELETE FROM portal_users WHERE id = ANY($1)', [createdPortalUserIds]);
    }
    if (createdContactIds.length > 0) {
      await pool.query('DELETE FROM contacts WHERE id = ANY($1)', [createdContactIds]);
    }
    if (createdStatusIds.length > 0) {
      await pool.query('DELETE FROM case_statuses WHERE id = ANY($1)', [createdStatusIds]);
    }
    if (createdCaseTypeIds.length > 0) {
      await pool.query('DELETE FROM case_types WHERE id = ANY($1)', [createdCaseTypeIds]);
    }
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
    }
    if (organizationId) {
      await pool.query('DELETE FROM accounts WHERE id = $1', [organizationId]);
    }
  });

  it('only returns explicitly visible non-internal notes', async () => {
    const response = await request(app)
      .get('/api/v2/portal/notes')
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const notesPayload = unwrap<PortalPagedPayload<{ id: string }>>(response.body);
    const noteIds = notesPayload.items.map((entry) => entry.id);

    expect(noteIds).toContain(visibleNoteId);
    expect(noteIds).not.toContain(hiddenNoteId);
    expect(noteIds).not.toContain(internalVisibleNoteId);
    expect(notesPayload.page.total).toBe(1);
  });

  it('supports filtered/paged note queries using the portal offset-page contract', async () => {
    const response = await request(app)
      .get('/api/v2/portal/notes')
      .query({
        search: 'Visible portal',
        sort: 'subject',
        order: 'asc',
        limit: 1,
        offset: 0,
      })
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const notesPayload = unwrap<PortalPagedPayload<{ id: string }>>(response.body);
    expect(notesPayload.items).toHaveLength(1);
    expect(notesPayload.items[0].id).toBe(visibleNoteId);
    expect(notesPayload.page).toEqual({
      limit: 1,
      offset: 0,
      has_more: false,
      total: 1,
    });
  });

  it('only returns explicitly shared documents and forms and blocks hidden downloads', async () => {
    const docsResponse = await request(app)
      .get('/api/v2/portal/documents')
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const docsPayload = unwrap<PortalPagedPayload<{ id: string }>>(docsResponse.body);
    const docIds = docsPayload.items.map((entry) => entry.id);
    expect(docIds).toContain(visibleDocId);
    expect(docIds).toContain(visibleFormDocId);
    expect(docIds).not.toContain(hiddenDocId);
    expect(docsPayload.page.total).toBeGreaterThanOrEqual(2);

    const formsResponse = await request(app)
      .get('/api/v2/portal/forms')
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const formsPayload = unwrap<PortalPagedPayload<{ id: string }>>(formsResponse.body);
    const formIds = formsPayload.items.map((entry) => entry.id);
    expect(formIds).toContain(visibleFormDocId);
    expect(formIds).not.toContain(visibleDocId);
    expect(formsPayload.page.total).toBe(1);

    await request(app)
      .get(`/api/v2/portal/documents/${hiddenDocId}/download`)
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(404);

    const missingFileResponse = await request(app)
      .get(`/api/v2/portal/documents/${missingFileDocId}/download`)
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(404);

    const errorCode = missingFileResponse.body?.error?.code || missingFileResponse.body?.code;
    expect(errorCode).toMatch(/DOCUMENT_FILE_NOT_FOUND|NOT_FOUND/i);
  });

  it('returns assignment-backed portal forms buckets on the canonical portal forms route', async () => {
    const activeResponse = await request(app)
      .get('/api/v2/portal/forms/assignments')
      .query({ status: 'active' })
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const activePayload = unwrap<
      Array<{
        id: string;
        status: string;
        case_id: string;
        case_number?: string | null;
        case_title?: string | null;
        due_at?: string | null;
      }>
    >(activeResponse.body);

    expect(activePayload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: activeAssignmentId,
          status: 'sent',
          case_id: portalCaseId,
          case_title: 'Portal Forms Case',
        }),
      ])
    );
    expect(activePayload.find((assignment) => assignment.id === reviewedAssignmentId)).toBeUndefined();

    const completedResponse = await request(app)
      .get('/api/v2/portal/forms/assignments')
      .query({ status: 'completed' })
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const completedPayload = unwrap<
      Array<{
        id: string;
        status: string;
      }>
    >(completedResponse.body);

    expect(completedPayload).toEqual([
      expect.objectContaining({
        id: reviewedAssignmentId,
        status: 'reviewed',
      }),
    ]);

    const exactStatusResponse = await request(app)
      .get('/api/v2/portal/forms/assignments')
      .query({ status: 'sent' })
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const exactStatusPayload = unwrap<Array<{ id: string; status: string }>>(exactStatusResponse.body);
    expect(exactStatusPayload).toEqual([
      expect.objectContaining({
        id: activeAssignmentId,
        status: 'sent',
      }),
    ]);
  });

  it('returns portal assignment detail with the packet download contract for reviewed submissions', async () => {
    const response = await request(app)
      .get(`/api/v2/portal/forms/assignments/${reviewedAssignmentId}`)
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const detail = unwrap<{
      assignment: {
        id: string;
        status: string;
        case_id: string;
        case_title?: string | null;
        latest_submission?: {
          response_packet_download_url?: string | null;
        } | null;
      };
      submissions: Array<{
        response_packet_download_url?: string | null;
      }>;
    }>(response.body);

    expect(detail.assignment).toMatchObject({
      id: reviewedAssignmentId,
      status: 'reviewed',
      case_id: portalCaseId,
      case_title: 'Portal Forms Case',
    });
    expect(detail.assignment.latest_submission?.response_packet_download_url).toBe(
      `/api/v2/portal/forms/assignments/${reviewedAssignmentId}/response-packet`
    );
    expect(detail.submissions[0]?.response_packet_download_url).toBe(
      `/api/v2/portal/forms/assignments/${reviewedAssignmentId}/response-packet`
    );
  });

  it('validates resource/event list query params for strict sort/search/order/limit/offset support', async () => {
    await request(app)
      .get('/api/v2/portal/events')
      .query({ sort: 'invalid_field' })
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(400);

    await request(app)
      .get('/api/v2/portal/documents')
      .query({ unknown: 'true' })
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(400);

    await request(app)
      .get('/api/v2/portal/reminders')
      .query({ order: 'up' })
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(400);

    await request(app)
      .get('/api/v2/portal/forms/assignments')
      .query({ status: 'unknown' })
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(400);
  });

  it('returns portal event registration check-in metadata for the portal user', async () => {
    const response = await request(app)
      .get('/api/v2/portal/events')
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const payload = unwrap<
      PortalPagedPayload<{
        id: string;
        registration_id?: string | null;
        check_in_token?: string | null;
        checked_in?: boolean | null;
        check_in_time?: string | null;
        check_in_method?: string | null;
        public_checkin_pin_hash?: string | null;
      }>
    >(response.body);

    const eventRow = payload.items.find((item) => item.id === portalEventId);
    expect(eventRow).toBeDefined();
    expect(eventRow?.registration_id).toBe(portalRegistrationId);
    expect(eventRow?.check_in_token).toBe(portalCheckInToken);
    expect(eventRow?.checked_in).toBe(true);
    expect(eventRow?.check_in_time).toBeTruthy();
    expect(eventRow?.check_in_method).toBe('qr');
    expect(eventRow).not.toHaveProperty('public_checkin_pin_hash');
  });

  it('filters portal events by date range without exposing out-of-range items', async () => {
    const from = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const filteredResponse = await request(app)
      .get('/api/v2/portal/events')
      .query({ from })
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const filteredPayload = unwrap<
      PortalPagedPayload<{
        id: string;
      }>
    >(filteredResponse.body);

    expect(filteredPayload.items.find((item) => item.id === portalEventId)).toBeUndefined();
  });
});
