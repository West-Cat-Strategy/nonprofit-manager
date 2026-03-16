import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';
import fileStorage from '../../services/fileStorageService';

describe('Portal Workspace Integration', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let adminUserId: string;
  let adminEmail: string;
  let contactId: string;
  let portalUserId: string;
  let portalEmail: string;
  let caseTypeId: string;
  let activeStatusId: string;
  let caseId: string;
  let contactDocumentId: string;
  let appointmentId: string;
  let eventId: string;
  let eventRegistrationId: string;
  let threadId: string;
  const createdCaseDocumentIds: string[] = [];
  const uploadedFilePaths: string[] = [];

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

    adminEmail = `portal-workspace-admin-${suffix}@example.com`;
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Portal', 'Workspace', 'admin', NOW(), NOW())
       RETURNING id`,
      [adminEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    adminUserId = userResult.rows[0].id as string;

    const caseTypeResult = await pool.query(
      `INSERT INTO case_types (name, description, created_at, updated_at)
       VALUES ($1, 'Portal workspace test type', NOW(), NOW())
       RETURNING id`,
      [`Portal Workspace Type ${suffix}`]
    );
    caseTypeId = caseTypeResult.rows[0].id as string;

    const statusResult = await pool.query(
      `INSERT INTO case_statuses (name, status_type, sort_order, is_active, created_at, updated_at)
       VALUES ($1, 'active', 10, true, NOW(), NOW())
       RETURNING id`,
      [`Portal Workspace Active ${suffix}`]
    );
    activeStatusId = statusResult.rows[0].id as string;

    portalEmail = `portal-workspace-client-${suffix}@example.com`;
    const contactResult = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
       VALUES ('Portal', 'Client', $1, NULL, NULL)
       RETURNING id`,
      [portalEmail]
    );
    contactId = contactResult.rows[0].id as string;

    const portalUserResult = await pool.query(
      `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
       VALUES ($1, $2, $3, 'active', true)
       RETURNING id`,
      [contactId, portalEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    portalUserId = portalUserResult.rows[0].id as string;

    const caseResult = await pool.query(
      `INSERT INTO cases (
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
       ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7, $7, NOW(), NOW())
       RETURNING id`,
      [
        `PORTAL-WORKSPACE-${suffix}`,
        contactId,
        caseTypeId,
        activeStatusId,
        'Housing Support Case',
        'Client workspace integration coverage',
        adminUserId,
      ]
    );
    caseId = caseResult.rows[0].id as string;

    const contactDocumentResult = await pool.query(
      `INSERT INTO contact_documents (
         contact_id,
         case_id,
         file_name,
         original_name,
         file_path,
         file_size,
         mime_type,
         document_type,
         title,
         description,
         is_portal_visible,
         created_by
       ) VALUES ($1, $2, 'welcome.pdf', 'welcome.pdf', $3, 512, 'application/pdf', 'report', 'Welcome Packet', 'Staff shared welcome packet', true, $4)
       RETURNING id`,
      [contactId, caseId, `documents/portal-workspace-welcome-${suffix}.pdf`, adminUserId]
    );
    contactDocumentId = contactDocumentResult.rows[0].id as string;

    const appointmentResult = await pool.query(
      `INSERT INTO appointments (
         contact_id,
         title,
         description,
         start_time,
         end_time,
         status,
         location,
         requested_by_portal,
         case_id,
         pointperson_user_id
       ) VALUES ($1, $2, $3, NOW() + interval '1 day', NOW() + interval '1 day 1 hour', 'confirmed', 'Main office', $4, $5, $6)
       RETURNING id`,
      [contactId, 'Upcoming Case Appointment', 'Bring intake papers', portalUserId, caseId, adminUserId]
    );
    appointmentId = appointmentResult.rows[0].id as string;

    const eventResult = await pool.query(
      `INSERT INTO events (
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
         'Client Orientation',
         'Workspace dashboard event',
         'community',
         'planned',
         true,
         NOW() + interval '2 days',
         NOW() + interval '2 days 2 hours',
         'Community hall',
         $1,
         $1
       )
       RETURNING id`,
      [adminUserId]
    );
    eventId = eventResult.rows[0].id as string;

    const eventRegistrationResult = await pool.query(
      `INSERT INTO event_registrations (
         event_id,
         contact_id,
         registration_status,
         checked_in,
         check_in_method
       ) VALUES ($1, $2, 'registered', false, 'manual')
       RETURNING id`,
      [eventId, contactId]
    );
    eventRegistrationId = eventRegistrationResult.rows[0].id as string;

    const threadResult = await pool.query(
      `INSERT INTO portal_threads (
         contact_id,
         case_id,
         portal_user_id,
         pointperson_user_id,
         subject,
         status,
         last_message_at,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW(), NOW())
       RETURNING id`,
      [contactId, caseId, portalUserId, adminUserId, 'Need help with documents']
    );
    threadId = threadResult.rows[0].id as string;

    await pool.query(
      `INSERT INTO portal_messages (
         thread_id,
         sender_type,
         sender_user_id,
         message_text,
         is_internal,
         created_at
       ) VALUES ($1, 'staff', $2, 'Please upload your intake documents here.', false, NOW())`,
      [threadId, adminUserId]
    );
  });

  afterAll(async () => {
    for (const filePath of uploadedFilePaths) {
      await fileStorage.deleteFile(filePath).catch(() => undefined);
    }

    if (createdCaseDocumentIds.length > 0) {
      await pool.query('DELETE FROM case_documents WHERE id = ANY($1)', [createdCaseDocumentIds]);
    }
    if (threadId) {
      await pool.query('DELETE FROM portal_messages WHERE thread_id = $1', [threadId]);
      await pool.query('DELETE FROM portal_threads WHERE id = $1', [threadId]);
    }
    if (eventRegistrationId) {
      await pool.query('DELETE FROM event_registrations WHERE id = $1', [eventRegistrationId]);
    }
    if (eventId) {
      await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
    }
    if (appointmentId) {
      await pool.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
    }
    if (contactDocumentId) {
      await pool.query('DELETE FROM contact_documents WHERE id = $1', [contactDocumentId]);
    }
    if (caseId) {
      await pool.query('DELETE FROM cases WHERE id = $1', [caseId]);
    }
    if (portalUserId) {
      await pool.query('DELETE FROM portal_users WHERE id = $1', [portalUserId]);
    }
    if (contactId) {
      await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);
    }
    if (activeStatusId) {
      await pool.query('DELETE FROM case_statuses WHERE id = $1', [activeStatusId]);
    }
    if (caseTypeId) {
      await pool.query('DELETE FROM case_types WHERE id = $1', [caseTypeId]);
    }
    if (adminUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    }
  });

  it('returns the aggregated portal workspace dashboard payload', async () => {
    const response = await request(app)
      .get('/api/v2/portal/dashboard')
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const payload = unwrap<{
      active_cases: Array<{ id: string }>;
      unread_threads_count: number;
      recent_threads: Array<{ id: string }>;
      next_appointment: { id: string } | null;
      upcoming_events: Array<{ id: string }>;
      recent_documents: Array<{ id: string }>;
      reminders: Array<{ type: string }>;
    }>(response.body);

    expect(payload.active_cases.map((entry) => entry.id)).toContain(caseId);
    expect(payload.unread_threads_count).toBeGreaterThanOrEqual(1);
    expect(payload.recent_threads.map((entry) => entry.id)).toContain(threadId);
    expect(payload.next_appointment?.id).toBe(appointmentId);
    expect(payload.upcoming_events.map((entry) => entry.id)).toContain(eventId);
    expect(payload.recent_documents.map((entry) => entry.id)).toContain(contactDocumentId);
    expect(payload.reminders.map((entry) => entry.type).sort()).toEqual(['appointment', 'event']);
  });

  it('uploads a case document through the portal and exposes it back to the client workspace', async () => {
    const uploadResponse = await request(app)
      .post(`/api/v2/portal/cases/${caseId}/documents`)
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .field('document_type', 'supporting_document')
      .field('document_name', 'Client intake package')
      .field('description', 'Uploaded from the portal workspace')
      .attach('file', Buffer.from('%PDF-1.4\nportal-upload'), {
        filename: 'client-intake.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const uploadedDocument = unwrap<{ id: string; file_path: string; visible_to_client: boolean }>(
      uploadResponse.body
    );
    createdCaseDocumentIds.push(uploadedDocument.id);
    uploadedFilePaths.push(uploadedDocument.file_path);
    expect(uploadedDocument.visible_to_client).toBe(true);

    const documentsResponse = await request(app)
      .get(`/api/v2/portal/cases/${caseId}/documents`)
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const documents = unwrap<Array<{ id: string; document_name: string }>>(documentsResponse.body);
    expect(documents.some((entry) => entry.id === uploadedDocument.id)).toBe(true);
  });
});
