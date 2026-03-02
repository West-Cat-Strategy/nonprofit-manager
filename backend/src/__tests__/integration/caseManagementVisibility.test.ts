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
      [portalBEmail, organizationId]
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

    const caseAResult = await pool.query(
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
      [`CASE-A-${suffix}`, contactAId, organizationId, caseTypeId, activeStatusId, 'Case Alpha', adminUserId]
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
      [`CASE-B-${suffix}`, contactBId, organizationId, caseTypeId, activeStatusId, 'Case Beta', adminUserId]
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
    const timeline = unwrap<Array<{ id: string; type: string }>>(timelineResponse.body);
    const timelineIds = timeline.map((entry) => entry.id);
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
