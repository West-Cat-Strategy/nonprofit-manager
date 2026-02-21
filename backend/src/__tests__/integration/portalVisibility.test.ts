import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Portal Visibility Integration', () => {
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

  const createdDocIds: string[] = [];
  const createdNoteIds: string[] = [];
  const createdPortalUserIds: string[] = [];
  const createdContactIds: string[] = [];

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

    portalEmail = `portal-visibility-${suffix}@example.com`;
    const contactResult = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
       VALUES ('Portal', 'Visibility', $1, NULL, NULL)
       RETURNING id`,
      [portalEmail]
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
  });

  afterAll(async () => {
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
  });

  it('only returns explicitly visible non-internal notes', async () => {
    const response = await request(app)
      .get('/api/v2/portal/notes')
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const noteRows = unwrap<Array<{ id: string }>>(response.body);
    const noteIds = noteRows.map((entry) => entry.id);

    expect(noteIds).toContain(visibleNoteId);
    expect(noteIds).not.toContain(hiddenNoteId);
    expect(noteIds).not.toContain(internalVisibleNoteId);
  });

  it('only returns explicitly shared documents and forms and blocks hidden downloads', async () => {
    const docsResponse = await request(app)
      .get('/api/v2/portal/documents')
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const docRows = unwrap<Array<{ id: string }>>(docsResponse.body);
    const docIds = docRows.map((entry) => entry.id);
    expect(docIds).toContain(visibleDocId);
    expect(docIds).toContain(visibleFormDocId);
    expect(docIds).not.toContain(hiddenDocId);

    const formsResponse = await request(app)
      .get('/api/v2/portal/forms')
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(200);

    const formRows = unwrap<Array<{ id: string }>>(formsResponse.body);
    const formIds = formRows.map((entry) => entry.id);
    expect(formIds).toContain(visibleFormDocId);
    expect(formIds).not.toContain(visibleDocId);

    await request(app)
      .get(`/api/v2/portal/documents/${hiddenDocId}/download`)
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .expect(404);
  });
});
