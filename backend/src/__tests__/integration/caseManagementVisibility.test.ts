import fs from 'fs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';
import fileStorage from '../../services/fileStorageService';

describe('Case Management Visibility Integration', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

  let adminUserId: string;
  let adminEmail: string;
  let adminToken: string;
  let organizationId: string;
  let organizationBId: string;

  let caseTypeId: string;
  let activeStatusId: string;

  let contactAId: string;
  let contactBId: string;
  let portalAUserId: string;
  let portalBUserId: string;
  let portalAEmail: string;
  let portalBEmail: string;
  let portalAToken: string;
  let portalBToken: string;

  let caseAId: string;
  let caseBId: string;

  const createdDocumentIds: string[] = [];
  const createdNoteIds: string[] = [];
  const createdOutcomeIds: string[] = [];
  const createdTopicEventIds: string[] = [];
  const createdTopicDefinitionIds: string[] = [];
  const createdCaseIds: string[] = [];
  const createdContactIds: string[] = [];
  const createdPortalUserIds: string[] = [];
  const createdStatusIds: string[] = [];
  const createdCaseTypeIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdAccountIds: string[] = [];
  const createdDocumentPaths: string[] = [];

  const authHeader = () => ({
    Authorization: `Bearer ${adminToken}`,
    'X-Organization-Id': organizationId,
  });

  beforeAll(async () => {
    const suffix = unique();

    adminEmail = `case-visibility-admin-${suffix}@example.com`;
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Case', 'Admin', 'admin', NOW(), NOW())
       RETURNING id`,
      [adminEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    adminUserId = userResult.rows[0].id as string;
    createdUserIds.push(adminUserId);
    adminToken = jwt.sign({ id: adminUserId, email: adminEmail, role: 'admin' }, getJwtSecret(), {
      expiresIn: '1h',
    });

    const orgResult = await pool.query(
      `INSERT INTO accounts (account_name, account_type, is_active, created_by, modified_by, created_at, updated_at)
       VALUES ($1, 'organization', true, $2, $2, NOW(), NOW())
       RETURNING id`,
      [`Case Visibility Org ${suffix}`, adminUserId]
    );
    organizationId = orgResult.rows[0].id as string;
    createdAccountIds.push(organizationId);

    const orgBResult = await pool.query(
      `INSERT INTO accounts (account_name, account_type, is_active, created_by, modified_by, created_at, updated_at)
       VALUES ($1, 'organization', true, $2, $2, NOW(), NOW())
       RETURNING id`,
      [`Case Visibility Org B ${suffix}`, adminUserId]
    );
    organizationBId = orgBResult.rows[0].id as string;
    createdAccountIds.push(organizationBId);

    adminToken = jwt.sign(
      { id: adminUserId, email: adminEmail, role: 'admin', organizationId },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    const caseTypeResult = await pool.query(
      `INSERT INTO case_types (name, description, created_at, updated_at)
       VALUES ($1, 'Case visibility type', NOW(), NOW())
       RETURNING id`,
      [`Case Visibility Type ${suffix}`]
    );
    caseTypeId = caseTypeResult.rows[0].id as string;
    createdCaseTypeIds.push(caseTypeId);

    const statusResult = await pool.query(
      `INSERT INTO case_statuses (name, status_type, sort_order, is_active, created_at, updated_at)
       VALUES ($1, 'active', 10, true, NOW(), NOW())
       RETURNING id`,
      [`Case Visibility Active ${suffix}`]
    );
    activeStatusId = statusResult.rows[0].id as string;
    createdStatusIds.push(activeStatusId);

    portalAEmail = `case-portal-a-${suffix}@example.com`;
    const contactAResult = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, account_id, created_by, modified_by)
       VALUES ('Portal', 'Alpha', $1, $2, NULL, NULL)
       RETURNING id`,
      [portalAEmail, organizationId]
    );
    contactAId = contactAResult.rows[0].id as string;
    createdContactIds.push(contactAId);

    const portalAResult = await pool.query(
      `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
       VALUES ($1, $2, $3, 'active', true)
       RETURNING id`,
      [contactAId, portalAEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    portalAUserId = portalAResult.rows[0].id as string;
    createdPortalUserIds.push(portalAUserId);
    portalAToken = jwt.sign(
      { id: portalAUserId, email: portalAEmail, contactId: contactAId, type: 'portal' as const },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    portalBEmail = `case-portal-b-${suffix}@example.com`;
    const contactBResult = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, account_id, created_by, modified_by)
       VALUES ('Portal', 'Beta', $1, $2, NULL, NULL)
       RETURNING id`,
      [portalBEmail, organizationBId]
    );
    contactBId = contactBResult.rows[0].id as string;
    createdContactIds.push(contactBId);

    const portalBResult = await pool.query(
      `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
       VALUES ($1, $2, $3, 'active', true)
       RETURNING id`,
      [contactBId, portalBEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    portalBUserId = portalBResult.rows[0].id as string;
    createdPortalUserIds.push(portalBUserId);
    portalBToken = jwt.sign(
      { id: portalBUserId, email: portalBEmail, contactId: contactBId, type: 'portal' as const },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    const caseAProvenance = {
      import_provenance: {
        cluster_id: `cluster-${suffix}`,
        primary_label: 'Westcat Intake Cluster',
        record_type: 'case_note',
        source_tables: ['contact_log', 'client_notes_and_stats', 'case_note'],
        source_files: [`westcat-${suffix}.csv`],
        source_role_breakdown: [
          {
            source_role: 'primary_case',
            source_tables: ['contact_log'],
            source_row_count: 1,
            source_row_ids: [`contact_log:${suffix}:1`],
          },
          {
            source_role: 'supporting_note',
            source_tables: ['client_notes_and_stats', 'case_note'],
            source_row_count: 2,
            source_row_ids: [`client_notes_and_stats:${suffix}:7`, `case_note:${suffix}:4`],
          },
        ],
        participant_ids: [contactAId],
        source_row_ids: [
          `contact_log:${suffix}:1`,
          `client_notes_and_stats:${suffix}:7`,
          `case_note:${suffix}:4`,
        ],
        source_row_count: 3,
        source_table_count: 3,
        source_file_count: 1,
        source_type_breakdown: ['contact_log', 'client_notes_and_stats', 'case_note'],
        link_confidence: 0.64,
        confidence_label: 'low',
        is_low_confidence: true,
      },
    };

    const caseAResult = await pool.query(
      `INSERT INTO cases (
         case_number,
          contact_id,
         account_id,
         case_type_id,
         status_id,
         title,
         custom_data,
         client_viewable,
         assigned_to,
         created_by,
         modified_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, false, $8, $8, $8, NOW(), NOW())
       RETURNING id`,
      [
        `CASE-A-${suffix}`,
        contactAId,
        organizationId,
        caseTypeId,
        activeStatusId,
        'Case Alpha',
        JSON.stringify(caseAProvenance),
        adminUserId,
      ]
    );
    caseAId = caseAResult.rows[0].id as string;
    createdCaseIds.push(caseAId);

    const caseBResult = await pool.query(
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
       ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7, $7, NOW(), NOW())
       RETURNING id`,
      [`CASE-B-${suffix}`, contactBId, organizationBId, caseTypeId, activeStatusId, 'Case Beta', adminUserId]
    );
    caseBId = caseBResult.rows[0].id as string;
    createdCaseIds.push(caseBId);
  });

  afterAll(async () => {
    if (createdCaseIds.length > 0) {
      const docPathResult = await pool.query(
        `SELECT file_path FROM case_documents WHERE case_id = ANY($1)`,
        [createdCaseIds]
      );
      for (const row of docPathResult.rows) {
        if (row.file_path) {
          createdDocumentPaths.push(row.file_path as string);
        }
      }
    }

    if (createdDocumentIds.length > 0) {
      await pool.query('DELETE FROM case_documents WHERE id = ANY($1)', [createdDocumentIds]);
    }
    if (createdOutcomeIds.length > 0) {
      await pool.query('DELETE FROM case_outcomes WHERE id = ANY($1)', [createdOutcomeIds]);
    }
    if (createdTopicEventIds.length > 0) {
      await pool.query('DELETE FROM case_topic_events WHERE id = ANY($1)', [createdTopicEventIds]);
    }
    if (createdTopicDefinitionIds.length > 0) {
      await pool.query('DELETE FROM case_topic_definitions WHERE id = ANY($1)', [createdTopicDefinitionIds]);
    }
    if (createdNoteIds.length > 0) {
      await pool.query('DELETE FROM case_notes WHERE id = ANY($1)', [createdNoteIds]);
    }
    if (createdCaseIds.length > 0) {
      await pool.query('DELETE FROM cases WHERE id = ANY($1)', [createdCaseIds]);
    }
    if (createdPortalUserIds.length > 0) {
      await pool.query('DELETE FROM portal_users WHERE id = ANY($1)', [createdPortalUserIds]);
    }
    if (createdContactIds.length > 0) {
      await pool.query('DELETE FROM contacts WHERE id = ANY($1)', [createdContactIds]);
    }
    if (createdAccountIds.length > 0) {
      await pool.query('DELETE FROM accounts WHERE id = ANY($1)', [createdAccountIds]);
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

    for (const relativePath of createdDocumentPaths) {
      try {
        const fullPath = fileStorage.getFullPath(relativePath);
        await fs.promises.unlink(fullPath);
      } catch {
        // Ignore missing files during cleanup.
      }
    }
  });

  it('allows staff to create, edit, and delete case notes', async () => {
    const createResponse = await request(app)
      .post('/api/v2/cases/notes')
      .set(authHeader())
      .send({
        case_id: caseAId,
        note_type: 'note',
        subject: 'Initial note',
        content: 'Line one\nLine two',
        category: 'progress',
        visible_to_client: false,
      })
      .expect(201);

    const createdNote = unwrap<{ id: string }>(createResponse.body);
    createdNoteIds.push(createdNote.id);

    const updateResponse = await request(app)
      .put(`/api/v2/cases/notes/${createdNote.id}`)
      .set(authHeader())
      .send({
        content: 'Updated note content',
        visible_to_client: true,
      })
      .expect(200);

    const updatedNote = unwrap<{ content: string; visible_to_client: boolean }>(updateResponse.body);
    expect(updatedNote.content).toBe('Updated note content');
    expect(updatedNote.visible_to_client).toBe(true);

    const deleteResponse = await request(app)
      .delete(`/api/v2/cases/notes/${createdNote.id}`)
      .set(authHeader())
      .expect(204);
    expect(deleteResponse.text).toBe('');
  });

  it('enforces client_viewable and visible_to_client rules in portal case APIs', async () => {
    const visibleNoteResponse = await request(app)
      .post('/api/v2/cases/notes')
      .set(authHeader())
      .send({
        case_id: caseAId,
        note_type: 'note',
        content: 'Visible timeline note',
        visible_to_client: true,
      })
      .expect(201);
    const visibleNote = unwrap<{ id: string }>(visibleNoteResponse.body);
    createdNoteIds.push(visibleNote.id);

    const hiddenNoteResponse = await request(app)
      .post('/api/v2/cases/notes')
      .set(authHeader())
      .send({
        case_id: caseAId,
        note_type: 'note',
        content: 'Hidden timeline note',
        visible_to_client: false,
      })
      .expect(201);
    const hiddenNote = unwrap<{ id: string }>(hiddenNoteResponse.body);
    createdNoteIds.push(hiddenNote.id);

    const visibleOutcomeResponse = await request(app)
      .post(`/api/v2/cases/${caseAId}/outcomes`)
      .set(authHeader())
      .send({
        outcome_type: 'housing_stabilized',
        notes: 'Visible outcome',
        visible_to_client: true,
      })
      .expect(201);
    const visibleOutcome = unwrap<{ id: string }>(visibleOutcomeResponse.body);
    createdOutcomeIds.push(visibleOutcome.id);

    const hiddenOutcomeResponse = await request(app)
      .post(`/api/v2/cases/${caseAId}/outcomes`)
      .set(authHeader())
      .send({
        outcome_type: 'internal_followup',
        notes: 'Hidden outcome',
        visible_to_client: false,
      })
      .expect(201);
    const hiddenOutcome = unwrap<{ id: string }>(hiddenOutcomeResponse.body);
    createdOutcomeIds.push(hiddenOutcome.id);

    const topicDefinitionResponse = await request(app)
      .post(`/api/v2/cases/${caseAId}/topics/definitions`)
      .set(authHeader())
      .send({ name: 'Housing' })
      .expect(201);
    const topicDefinition = unwrap<{ id: string }>(topicDefinitionResponse.body);
    createdTopicDefinitionIds.push(topicDefinition.id);

    const topicEventResponse = await request(app)
      .post(`/api/v2/cases/${caseAId}/topics`)
      .set(authHeader())
      .send({
        topic_definition_id: topicDefinition.id,
        notes: 'Topic discussion should stay internal',
      })
      .expect(201);
    const topicEvent = unwrap<{ id: string }>(topicEventResponse.body);
    createdTopicEventIds.push(topicEvent.id);

    const visibleDocUploadResponse = await request(app)
      .post(`/api/v2/cases/${caseAId}/documents`)
      .set(authHeader())
      .field('document_name', 'Visible Doc')
      .field('document_type', 'report')
      .field('visible_to_client', 'true')
      .attach('file', Buffer.from('%PDF-1.4\nvisible'), {
        filename: 'visible-case-doc.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const visibleDoc = unwrap<{ id: string }>(visibleDocUploadResponse.body);
    createdDocumentIds.push(visibleDoc.id);

    const hiddenDocUploadResponse = await request(app)
      .post(`/api/v2/cases/${caseAId}/documents`)
      .set(authHeader())
      .field('document_name', 'Hidden Doc')
      .field('document_type', 'report')
      .field('visible_to_client', 'false')
      .attach('file', Buffer.from('%PDF-1.4\nhidden'), {
        filename: 'hidden-case-doc.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const hiddenDoc = unwrap<{ id: string }>(hiddenDocUploadResponse.body);
    createdDocumentIds.push(hiddenDoc.id);

    const hiddenPortalList = await request(app)
      .get('/api/v2/portal/cases')
      .set('Cookie', [`portal_auth_token=${portalAToken}`])
      .expect(200);
    const hiddenCases = unwrap<Array<{ id: string }>>(hiddenPortalList.body);
    expect(hiddenCases.some((entry) => entry.id === caseAId)).toBe(false);

    await request(app)
      .put(`/api/v2/cases/${caseAId}/client-viewable`)
      .set(authHeader())
      .send({ client_viewable: true })
      .expect(200);

    const caseListResponse = await request(app)
      .get('/api/v2/portal/cases')
      .set('Cookie', [`portal_auth_token=${portalAToken}`])
      .expect(200);
    const caseList = unwrap<Array<{ id: string }>>(caseListResponse.body);
    expect(caseList.some((entry) => entry.id === caseAId)).toBe(true);

    await request(app)
      .get(`/api/v2/portal/cases/${caseAId}`)
      .set('Cookie', [`portal_auth_token=${portalAToken}`])
      .expect(200);

    const timelineResponse = await request(app)
      .get(`/api/v2/portal/cases/${caseAId}/timeline`)
      .set('Cookie', [`portal_auth_token=${portalAToken}`])
      .expect(200);
    const timelinePage = unwrap<{
      items: Array<{ id: string; type: string }>;
      page: { limit: number; has_more: boolean; next_cursor: string | null };
    }>(timelineResponse.body);
    const timelineIds = timelinePage.items.map((entry) => entry.id);
    expect(timelineIds).toContain(visibleNote.id);
    expect(timelineIds).toContain(visibleOutcome.id);
    expect(timelineIds).toContain(visibleDoc.id);
    expect(timelineIds).not.toContain(hiddenNote.id);
    expect(timelineIds).not.toContain(hiddenOutcome.id);
    expect(timelineIds).not.toContain(hiddenDoc.id);
    expect(timelineIds).not.toContain(topicEvent.id);

    const docsResponse = await request(app)
      .get(`/api/v2/portal/cases/${caseAId}/documents`)
      .set('Cookie', [`portal_auth_token=${portalAToken}`])
      .expect(200);
    const docs = unwrap<Array<{ id: string }>>(docsResponse.body);
    expect(docs.map((entry) => entry.id)).toContain(visibleDoc.id);
    expect(docs.map((entry) => entry.id)).not.toContain(hiddenDoc.id);

    await request(app)
      .get(`/api/v2/portal/cases/${caseAId}/documents/${visibleDoc.id}/download`)
      .set('Cookie', [`portal_auth_token=${portalAToken}`])
      .expect(200);

    await request(app)
      .get(`/api/v2/portal/cases/${caseAId}/documents/${hiddenDoc.id}/download`)
      .set('Cookie', [`portal_auth_token=${portalAToken}`])
      .expect(404);

    await request(app)
      .get(`/api/v2/portal/cases/${caseAId}`)
      .set('Cookie', [`portal_auth_token=${portalBToken}`])
      .expect(404);
  });

  it('returns imported case provenance for staff and only portal-safe provenance for clients', async () => {
    const importedListResponse = await request(app)
      .get('/api/v2/cases')
      .query({ imported_only: true })
      .set(authHeader())
      .expect(200);

    const importedList = unwrap<{ cases: Array<{ id: string; provenance?: { source_table_count?: number } }> }>(
      importedListResponse.body
    );
    const importedCaseIds = importedList.cases.map((entry) => entry.id);
    expect(importedCaseIds).toContain(caseAId);
    expect(importedCaseIds).not.toContain(caseBId);
    expect(importedList.cases.find((entry) => entry.id === caseAId)?.provenance?.source_table_count).toBe(3);

    const staffDetailResponse = await request(app)
      .get(`/api/v2/cases/${caseAId}`)
      .set(authHeader())
      .expect(200);

    const staffCase = unwrap<{
      provenance?: {
        cluster_id?: string;
        primary_label?: string;
        source_row_ids?: string[];
        participant_ids?: string[];
        source_table_count?: number;
        confidence_label?: string;
      } | null;
    }>(staffDetailResponse.body);

    expect(staffCase.provenance?.cluster_id).toBeTruthy();
    expect(staffCase.provenance?.source_row_ids).toEqual(
      expect.arrayContaining([expect.stringContaining('contact_log')])
    );
    expect(staffCase.provenance?.participant_ids).toEqual([contactAId]);
    expect(staffCase.provenance?.source_table_count).toBe(3);
    expect(staffCase.provenance?.confidence_label).toBe('low');

    const portalDetailResponse = await request(app)
      .get(`/api/v2/portal/cases/${caseAId}`)
      .set('Cookie', [`portal_auth_token=${portalAToken}`])
      .expect(200);

    const portalCase = unwrap<{
      provenance?: {
        primary_label?: string;
        record_type?: string;
        source_tables?: string[];
        source_role_breakdown?: Array<{
          source_role: string;
          source_tables: string[];
          source_row_count: number;
        }>;
        source_table_count?: number;
        source_row_ids?: string[];
        cluster_id?: string;
        participant_ids?: string[];
      } | null;
    }>(portalDetailResponse.body);

    expect(portalCase.provenance?.primary_label).toBe('Westcat Intake Cluster');
    expect(portalCase.provenance?.source_table_count).toBe(3);
    expect(portalCase.provenance?.source_role_breakdown?.[0]?.source_row_count).toBe(1);
    expect(portalCase.provenance?.cluster_id).toBeUndefined();
    expect(portalCase.provenance?.source_row_ids).toBeUndefined();
    expect(portalCase.provenance?.participant_ids).toBeUndefined();
  });

  it('keeps cases scoped to the active organization for list, detail, and timeline access', async () => {
    const listResponse = await request(app)
      .get('/api/v2/cases')
      .set(authHeader())
      .expect(200);

    const listBody = unwrap<{ cases: Array<{ id: string }> }>(listResponse.body);
    const listedCaseIds = listBody.cases.map((entry) => entry.id);
    expect(listedCaseIds).toContain(caseAId);
    expect(listedCaseIds).not.toContain(caseBId);

    await request(app)
      .get(`/api/v2/cases/${caseBId}`)
      .set(authHeader())
      .expect(404);

    await request(app)
      .get(`/api/v2/cases/${caseBId}/timeline`)
      .set(authHeader())
      .expect(404);
  });

  it('rejects disallowed case document upload mime types', async () => {
    await request(app)
      .post(`/api/v2/cases/${caseAId}/documents`)
      .set(authHeader())
      .field('document_name', 'Bad file')
      .attach('file', Buffer.from('binary-data'), {
        filename: 'malicious.exe',
        contentType: 'application/x-msdownload',
      })
      .expect(400);
  });
});
