import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Portal Messaging Integration', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let adminUserId: string;
  let adminEmail: string;
  let contactId: string;
  let portalUserId: string;
  let portalEmail: string;
  let caseTypeId: string;
  let activeStatusId: string;
  let assignedCaseId: string;
  let unassignedCaseId: string;

  const createdCaseIds: string[] = [];
  const createdStatusIds: string[] = [];
  const createdCaseTypeIds: string[] = [];
  const createdPortalUserIds: string[] = [];
  const createdContactIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildAdminToken = () =>
    jwt.sign({ id: adminUserId, email: adminEmail, role: 'admin' }, getJwtSecret(), {
      expiresIn: '1h',
    });

  const buildPortalToken = () =>
    jwt.sign(
      { id: portalUserId, email: portalEmail, contactId, type: 'portal' as const },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

  beforeAll(async () => {
    const suffix = unique();

    adminEmail = `portal-admin-${suffix}@example.com`;
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Portal', 'Admin', 'admin', NOW(), NOW())
       RETURNING id`,
      [adminEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    adminUserId = userResult.rows[0].id as string;
    createdUserIds.push(adminUserId);

    const caseTypeResult = await pool.query(
      `INSERT INTO case_types (name, description, created_at, updated_at)
       VALUES ($1, 'Messaging test type', NOW(), NOW())
       RETURNING id`,
      [`Portal Messaging Type ${suffix}`]
    );
    caseTypeId = caseTypeResult.rows[0].id as string;
    createdCaseTypeIds.push(caseTypeId);

    const statusResult = await pool.query(
      `INSERT INTO case_statuses (name, status_type, sort_order, is_active, created_at, updated_at)
       VALUES ($1, 'active', 10, true, NOW(), NOW())
       RETURNING id`,
      [`Portal Messaging Active ${suffix}`]
    );
    activeStatusId = statusResult.rows[0].id as string;
    createdStatusIds.push(activeStatusId);

    portalEmail = `portal-client-${suffix}@example.com`;
    const contactResult = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
       VALUES ('Portal', 'Client', $1, NULL, NULL)
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

    const assignedCaseResult = await pool.query(
      `INSERT INTO cases (
         case_number,
         contact_id,
         case_type_id,
         status_id,
         title,
         assigned_to,
         created_by,
         modified_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $6, $6, NOW(), NOW())
       RETURNING id`,
      [`PORTAL-MSG-${suffix}`, contactId, caseTypeId, activeStatusId, 'Assigned Messaging Case', adminUserId]
    );
    assignedCaseId = assignedCaseResult.rows[0].id as string;
    createdCaseIds.push(assignedCaseId);

    const unassignedCaseResult = await pool.query(
      `INSERT INTO cases (
         case_number,
         contact_id,
         case_type_id,
         status_id,
         title,
         assigned_to,
         created_by,
         modified_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, NULL, $6, $6, NOW(), NOW())
       RETURNING id`,
      [`PORTAL-NOASSIGN-${suffix}`, contactId, caseTypeId, activeStatusId, 'Unassigned Messaging Case', adminUserId]
    );
    unassignedCaseId = unassignedCaseResult.rows[0].id as string;
    createdCaseIds.push(unassignedCaseId);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM portal_messages WHERE thread_id IN (SELECT id FROM portal_threads WHERE portal_user_id = ANY($1))', [createdPortalUserIds]);
    await pool.query('DELETE FROM portal_threads WHERE portal_user_id = ANY($1)', [createdPortalUserIds]);
    await pool.query('DELETE FROM case_notes WHERE case_id = ANY($1)', [createdCaseIds]);
    await pool.query('DELETE FROM cases WHERE id = ANY($1)', [createdCaseIds]);
    await pool.query('DELETE FROM portal_users WHERE id = ANY($1)', [createdPortalUserIds]);
    await pool.query('DELETE FROM contacts WHERE id = ANY($1)', [createdContactIds]);
    await pool.query('DELETE FROM case_statuses WHERE id = ANY($1)', [createdStatusIds]);
    await pool.query('DELETE FROM case_types WHERE id = ANY($1)', [createdCaseTypeIds]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
  });

  it('creates a portal thread and allows staff reply through admin conversation endpoint', async () => {
    const portalToken = buildPortalToken();
    const adminToken = buildAdminToken();

    const createResponse = await request(app)
      .post('/api/portal/messages/threads')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: assignedCaseId,
        subject: 'Need help with upcoming appointment',
        message: 'Could we adjust the meeting time?',
      })
      .expect(201);

    expect(createResponse.body.thread).toBeDefined();
    const threadId = createResponse.body.thread.id as string;

    await request(app)
      .post(`/api/portal/admin/conversations/${threadId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Absolutely. Please suggest two time options.',
      })
      .expect(201);

    const threadResponse = await request(app)
      .get(`/api/portal/messages/threads/${threadId}`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .expect(200);

    expect(threadResponse.body.messages.some((entry: { sender_type: string }) => entry.sender_type === 'staff')).toBe(true);
  });

  it('rejects thread creation for a case that has no assigned pointperson', async () => {
    const portalToken = buildPortalToken();

    const response = await request(app)
      .post('/api/portal/messages/threads')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: unassignedCaseId,
        subject: 'No staff assigned',
        message: 'Trying to send a message',
      })
      .expect(400);

    expect(response.body.error).toMatch(/assigned pointperson/i);
  });
});
