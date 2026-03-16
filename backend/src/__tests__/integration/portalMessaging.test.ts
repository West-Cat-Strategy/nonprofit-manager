import request from 'supertest';
import http from 'http';
import type { AddressInfo } from 'net';
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
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

  const openStreamAndReadFirstChunk = async (input: {
    path: string;
    headers?: Record<string, string>;
  }): Promise<{ status: number; contentType: string | undefined; firstChunk: string }> =>
    new Promise((resolve, reject) => {
      let settled = false;
      const server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: input.path,
            method: 'GET',
            headers: input.headers,
          },
          (res) => {
            res.setEncoding('utf8');
            res.once('data', (chunk) => {
              settled = true;
              req.destroy();
              res.destroy();
              server.close(() => {
                resolve({
                  status: res.statusCode || 0,
                  contentType: typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : undefined,
                  firstChunk: chunk,
                });
              });
            });

            res.once('end', () => {
              if (settled) return;
              settled = true;
              server.close(() => {
                reject(new Error('Stream ended before data was received'));
              });
            });
          }
        );

        req.setTimeout(5000, () => {
          if (settled) return;
          settled = true;
          req.destroy(new Error('Timed out waiting for SSE stream'));
        });
        req.once('error', (error) => {
          if (settled) return;
          settled = true;
          server.close(() => reject(error));
        });
        req.end();
      });
    });

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
         client_viewable,
         assigned_to,
         created_by,
         modified_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, true, $6, $6, $6, NOW(), NOW())
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
         client_viewable,
         assigned_to,
         created_by,
         modified_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, true, NULL, $6, $6, NOW(), NOW())
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
      .post('/api/v2/portal/messages/threads')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: assignedCaseId,
        subject: 'Need help with upcoming appointment',
        message: 'Could we adjust the meeting time?',
      })
      .expect(201);

    const created = unwrap<{ thread: { id: string } }>(createResponse.body);
    expect(created.thread).toBeDefined();
    const threadId = created.thread.id as string;

    await request(app)
      .post(`/api/v2/portal/admin/conversations/${threadId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Absolutely. Please suggest two time options.',
      })
      .expect(201);

    const threadResponse = await request(app)
      .get(`/api/v2/portal/messages/threads/${threadId}`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .expect(200);

    const thread = unwrap<{ messages: Array<{ sender_type: string }> }>(threadResponse.body);
    expect(thread.messages.some((entry) => entry.sender_type === 'staff')).toBe(true);
  });

  it('deduplicates repeated staff replies that reuse the same client_message_id', async () => {
    const portalToken = buildPortalToken();
    const adminToken = buildAdminToken();
    const clientMessageId = '11111111-1111-4111-8111-111111111111';

    const createResponse = await request(app)
      .post('/api/v2/portal/messages/threads')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: assignedCaseId,
        subject: 'Retry-safe reply thread',
        message: 'Opening the thread',
      })
      .expect(201);

    const threadId = unwrap<{ thread: { id: string } }>(createResponse.body).thread.id;

    const firstReply = await request(app)
      .post(`/api/v2/portal/admin/conversations/${threadId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'This should only be created once.',
        client_message_id: clientMessageId,
      })
      .expect(201);

    const secondReply = await request(app)
      .post(`/api/v2/portal/admin/conversations/${threadId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'This should only be created once.',
        client_message_id: clientMessageId,
      })
      .expect(201);

    const firstMessage = unwrap<{ message: { id: string } }>(firstReply.body).message;
    const secondMessage = unwrap<{ message: { id: string } }>(secondReply.body).message;
    expect(secondMessage.id).toBe(firstMessage.id);

    const threadResponse = await request(app)
      .get(`/api/v2/portal/messages/threads/${threadId}`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .expect(200);

    const thread = unwrap<{
      messages: Array<{ id: string; sender_type: string; client_message_id?: string | null }>;
    }>(threadResponse.body);
    const matchingReplies = thread.messages.filter(
      (entry) =>
        entry.sender_type === 'staff' && entry.client_message_id === clientMessageId
    );

    expect(matchingReplies).toHaveLength(1);
    expect(matchingReplies[0]?.id).toBe(firstMessage.id);
  });

  it('rejects thread creation for a case that has no assigned pointperson', async () => {
    const portalToken = buildPortalToken();

    const response = await request(app)
      .post('/api/v2/portal/messages/threads')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: unassignedCaseId,
        subject: 'No staff assigned',
        message: 'Trying to send a message',
      })
      .expect(400);

    expect(response.body.error?.message ?? response.body.error).toMatch(/assigned pointperson/i);
  });

  it('supports thread filtering and pagination for portal and admin views', async () => {
    const portalToken = buildPortalToken();
    const adminToken = buildAdminToken();

    const openThreadResponse = await request(app)
      .post('/api/v2/portal/messages/threads')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: assignedCaseId,
        subject: 'Open thread for filters',
        message: 'Need a status filter check',
      })
      .expect(201);

    const closedThreadResponse = await request(app)
      .post('/api/v2/portal/messages/threads')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: assignedCaseId,
        subject: 'Closed thread for filters',
        message: 'Need a second thread',
      })
      .expect(201);

    const openThreadId = unwrap<{ thread: { id: string } }>(openThreadResponse.body).thread.id;
    const closedThreadId = unwrap<{ thread: { id: string } }>(closedThreadResponse.body).thread.id;

    await request(app)
      .patch(`/api/v2/portal/messages/threads/${closedThreadId}`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({ status: 'closed' })
      .expect(200);

    const openFiltered = await request(app)
      .get('/api/v2/portal/messages/threads')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .query({ status: 'open', search: 'Open thread', limit: 10, offset: 0 })
      .expect(200);

    const openRows = unwrap<{ threads: Array<{ id: string }> }>(openFiltered.body).threads;
    expect(openRows.some((row) => row.id === openThreadId)).toBe(true);
    expect(openRows.some((row) => row.id === closedThreadId)).toBe(false);

    const adminFiltered = await request(app)
      .get('/api/v2/portal/admin/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: 'closed', search: 'Closed thread', limit: 1, offset: 0 })
      .expect(200);

    const adminRows = adminFiltered.body.conversations as Array<{ id: string }>;
    expect(adminRows.length).toBe(1);
    expect(adminRows[0]?.id).toBe(closedThreadId);
  });

  it('rejects unauthorized stream clients and opens stream for authenticated sessions when enabled', async () => {
    const portalToken = buildPortalToken();
    const adminToken = buildAdminToken();
    const originalRealtime = process.env.PORTAL_REALTIME_ENABLED;
    process.env.PORTAL_REALTIME_ENABLED = 'true';

    try {
      await request(app).get('/api/v2/portal/stream').expect(401);
      await request(app).get('/api/v2/portal/admin/stream').expect(401);

      const portalStream = await openStreamAndReadFirstChunk({
        path: '/api/v2/portal/stream?channels=messages',
        headers: { Cookie: `portal_auth_token=${portalToken}` },
      });
      expect(portalStream.status).toBe(200);
      expect(portalStream.contentType).toContain('text/event-stream');
      expect(portalStream.firstChunk).toMatch(/event:/i);

      const adminStream = await openStreamAndReadFirstChunk({
        path: '/api/v2/portal/admin/stream?channels=conversations',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(adminStream.status).toBe(200);
      expect(adminStream.contentType).toContain('text/event-stream');
      expect(adminStream.firstChunk).toMatch(/event:/i);
    } finally {
      process.env.PORTAL_REALTIME_ENABLED = originalRealtime;
    }
  });
});
