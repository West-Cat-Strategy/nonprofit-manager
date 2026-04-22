import request from 'supertest';
import { Client } from 'pg';
import app from '../../index';
import pool from '../../config/database';
import { issueAppSessionToken } from '../../utils/sessionTokens';

describe('Event API Integration Tests', () => {
  let authToken: string;
  let adminUserId: string;
  let adminEmail: string;
  let managerAuthToken: string;
  let managerUserId: string;
  let managerEmail: string;
  let organizationId: string;
  let secondaryOrganizationId: string;
  const createdAccountIds: string[] = [];
  const createdDataScopeIds: string[] = [];
  const createdContactIds: string[] = [];
  const createdScopedEventIds: string[] = [];
  const createdScopedRegistrationIds: string[] = [];
  const createdCaseIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdTemplateIds: string[] = [];
  const createdSiteIds: string[] = [];
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;
  const createAppRoleClient = async (): Promise<Client> => {
    const client = new Client({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number.parseInt(process.env.DB_PORT || '8012', 10),
      database: process.env.DB_NAME || 'nonprofit_manager_test',
      user: process.env.APP_DB_USER || process.env.DB_APP_USER || 'nonprofit_app_user',
      password: process.env.APP_DB_PASSWORD || process.env.DB_APP_PASSWORD || 'nonprofit_app_password',
    });
    await client.connect();
    return client;
  };
  const issueFreshToken = async (params: {
    userId: string;
    email: string;
    role: string;
    organizationId: string;
  }): Promise<string> => {
    const result = await pool.query<{ auth_revision: number }>(
      `SELECT COALESCE(auth_revision, 0) AS auth_revision
       FROM users
       WHERE id = $1`,
      [params.userId]
    );

    return issueAppSessionToken({
      id: params.userId,
      email: params.email,
      role: params.role,
      organizationId: params.organizationId,
      authRevision: result.rows[0]?.auth_revision ?? 0,
    });
  };
  const expectCanonicalError = (response: request.Response, code: string): void => {
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code,
        message: expect.any(String),
      },
    });
  };
  const expectEventListPayload = (
    response: request.Response
  ): {
    data: Array<Record<string, unknown>>;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  } => {
    expect(response.body).toMatchObject({
      success: true,
      data: {
        data: expect.any(Array),
        pagination: {
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
        },
      },
      pagination: {
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
      },
    });

    const payload = unwrap<{
      data: Array<Record<string, unknown>>;
      pagination: {
        page: number;
        limit: number;
        total: number;
      };
    }>(response.body);

    expect(response.body.pagination).toEqual(payload.pagination);
    return payload;
  };
  const getFirstOccurrenceId = async (eventId: string): Promise<string> => {
    const result = await pool.query<{ id: string }>(
      `SELECT id
       FROM event_occurrences
       WHERE event_id = $1
       ORDER BY start_date ASC
       LIMIT 1`,
      [eventId]
    );

    const occurrenceId = result.rows[0]?.id;
    if (!occurrenceId) {
      throw new Error(`Expected an occurrence for event ${eventId}`);
    }

    return occurrenceId;
  };
  const insertOccurrenceForEvent = async (
    eventId: string,
    eventName: string,
    userId: string,
    organizationIdOverride: string
  ): Promise<string> => {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO event_occurrences (
         event_id,
         organization_id,
         sequence_index,
         scheduled_start_date,
         scheduled_end_date,
         start_date,
         end_date,
         status,
         event_name,
         created_by,
         modified_by
       )
       VALUES (
         $1,
         $2,
         0,
         NOW() + interval '1 day',
         NOW() + interval '1 day 2 hours',
         NOW() + interval '1 day',
         NOW() + interval '1 day 2 hours',
         'planned',
         $3,
         $4,
         $4
       )
       RETURNING id`,
      [eventId, organizationIdOverride, eventName, userId]
    );

    return result.rows[0].id;
  };

  beforeAll(async () => {
    adminEmail = `event-admin-${unique()}@example.com`;
    const adminUserResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Event', 'Tester', 'admin', NOW(), NOW())
       RETURNING id`,
      [adminEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );

    adminUserId = adminUserResult.rows[0].id;

    managerEmail = `event-manager-${unique()}@example.com`;
    const managerUserResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Event', 'Manager', 'manager', NOW(), NOW())
       RETURNING id`,
      [managerEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    managerUserId = managerUserResult.rows[0].id;
    createdUserIds.push(managerUserId);

    const orgResult = await pool.query<{ id: string }>(
      `INSERT INTO accounts (account_name, account_type, is_active, created_by, modified_by, created_at, updated_at)
       VALUES ($1, 'organization', true, $2, $2, NOW(), NOW())
       RETURNING id`,
      [`Events Org ${unique()}`, adminUserId]
    );
    organizationId = orgResult.rows[0].id;
    createdAccountIds.push(organizationId);

    const secondaryOrgResult = await pool.query<{ id: string }>(
      `INSERT INTO accounts (account_name, account_type, is_active, created_by, modified_by, created_at, updated_at)
       VALUES ($1, 'organization', true, $2, $2, NOW(), NOW())
       RETURNING id`,
      [`Events Org Secondary ${unique()}`, adminUserId]
    );
    secondaryOrganizationId = secondaryOrgResult.rows[0].id;
    createdAccountIds.push(secondaryOrganizationId);

  });

  beforeEach(async () => {
    authToken = await issueFreshToken({
      userId: adminUserId,
      email: adminEmail,
      role: 'admin',
      organizationId,
    });
    managerAuthToken = await issueFreshToken({
      userId: managerUserId,
      email: managerEmail,
      role: 'manager',
      organizationId,
    });
  });

  afterAll(async () => {
    if (createdDataScopeIds.length > 0) {
      await pool.query('DELETE FROM data_scopes WHERE id = ANY($1::uuid[])', [createdDataScopeIds]);
    }
    if (createdContactIds.length > 0) {
      await pool.query(
        `DELETE FROM activity_events
         WHERE related_entity_type = 'contact'
           AND related_entity_id = ANY($1::uuid[])`,
        [createdContactIds]
      );
    }
    if (createdScopedRegistrationIds.length > 0) {
      await pool.query('DELETE FROM event_registrations WHERE id = ANY($1::uuid[])', [
        createdScopedRegistrationIds,
      ]);
    }
    if (createdCaseIds.length > 0) {
      await pool.query('DELETE FROM cases WHERE id = ANY($1::uuid[])', [createdCaseIds]);
    }
    if (createdScopedEventIds.length > 0) {
      await pool.query('DELETE FROM events WHERE id = ANY($1::uuid[])', [createdScopedEventIds]);
    }
    if (createdContactIds.length > 0) {
      await pool.query('DELETE FROM contacts WHERE id = ANY($1::uuid[])', [createdContactIds]);
    }

    if (createdSiteIds.length > 0) {
      await pool.query('DELETE FROM published_sites WHERE id = ANY($1::uuid[])', [createdSiteIds]);
    }

    if (createdTemplateIds.length > 0) {
      await pool.query('DELETE FROM template_pages WHERE template_id = ANY($1::uuid[])', [
        createdTemplateIds,
      ]);
      await pool.query('DELETE FROM templates WHERE id = ANY($1::uuid[])', [createdTemplateIds]);
    }

    if (createdAccountIds.length > 0) {
      await pool.query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [createdAccountIds]);
    }

    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
    }

    if (adminUserId) {
      await pool.query('DELETE FROM events WHERE created_by = $1 OR modified_by = $1', [
        adminUserId,
      ]);
      await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    }
  });

  describe('database RLS contract', () => {
    it('prevents cross-organization event reads and writes for the app role', async () => {
      await pool.query(
        `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
         VALUES ($1, $2, 'editor', $3, true)
         ON CONFLICT (user_id, account_id) DO UPDATE
         SET access_level = EXCLUDED.access_level,
             granted_by = EXCLUDED.granted_by,
             is_active = EXCLUDED.is_active`,
        [managerUserId, organizationId, adminUserId]
      );

      const allowedEventName = `RLS Allowed Event ${unique()}`;
      const allowedEventResult = await pool.query<{ id: string }>(
        `INSERT INTO events (organization_id, name, event_type, start_date, end_date, created_by, modified_by)
         VALUES ($1, $2, 'community', NOW() + interval '1 day', NOW() + interval '1 day 2 hours', $3, $3)
         RETURNING id`,
        [organizationId, allowedEventName, adminUserId]
      );
      const allowedEventId = allowedEventResult.rows[0].id;
      createdScopedEventIds.push(allowedEventId);

      const blockedEventName = `RLS Blocked Event ${unique()}`;
      const blockedEventResult = await pool.query<{ id: string }>(
        `INSERT INTO events (organization_id, name, event_type, start_date, end_date, created_by, modified_by)
         VALUES ($1, $2, 'community', NOW() + interval '1 day', NOW() + interval '1 day 2 hours', $3, $3)
         RETURNING id`,
        [secondaryOrganizationId, blockedEventName, adminUserId]
      );
      const blockedEventId = blockedEventResult.rows[0].id;
      createdScopedEventIds.push(blockedEventId);

      const allowedOccurrenceId = await insertOccurrenceForEvent(
        allowedEventId,
        allowedEventName,
        adminUserId,
        organizationId
      );
      const blockedOccurrenceId = await insertOccurrenceForEvent(
        blockedEventId,
        blockedEventName,
        adminUserId,
        secondaryOrganizationId
      );

      const appClient = await createAppRoleClient();

      try {
        await appClient.query("SELECT set_config('app.current_user_id', $1, false)", [managerUserId]);

        const visibleEvents = await appClient.query<{ id: string }>(
          `SELECT id
           FROM events
           WHERE id = ANY($1::uuid[])
           ORDER BY id`,
          [[allowedEventId, blockedEventId]]
        );
        expect(visibleEvents.rows.map((row) => row.id)).toEqual([allowedEventId]);

        const visibleOccurrences = await appClient.query<{ id: string }>(
          `SELECT id
           FROM event_occurrences
           WHERE id = ANY($1::uuid[])
           ORDER BY id`,
          [[allowedOccurrenceId, blockedOccurrenceId]]
        );
        expect(visibleOccurrences.rows.map((row) => row.id)).toEqual([allowedOccurrenceId]);

        const writableEventName = `RLS Writable Event ${unique()}`;
        const writableEventResult = await appClient.query<{ id: string }>(
          `INSERT INTO events (organization_id, name, event_type, start_date, end_date, created_by, modified_by)
           VALUES ($1, $2, 'community', NOW() + interval '2 day', NOW() + interval '2 day 2 hours', $3, $3)
           RETURNING id`,
          [organizationId, writableEventName, managerUserId]
        );
        const writableEventId = writableEventResult.rows[0].id;
        createdScopedEventIds.push(writableEventId);

        const writableOccurrenceResult = await appClient.query<{ id: string }>(
          `INSERT INTO event_occurrences (
             event_id,
             organization_id,
             sequence_index,
             scheduled_start_date,
             scheduled_end_date,
             start_date,
             end_date,
             status,
             event_name,
             created_by,
             modified_by
           )
           VALUES (
             $1,
             $2,
             0,
             NOW() + interval '2 day',
             NOW() + interval '2 day 2 hours',
             NOW() + interval '2 day',
             NOW() + interval '2 day 2 hours',
             'planned',
             $3,
             $4,
             $4
           )
           RETURNING id`,
          [writableEventId, organizationId, writableEventName, managerUserId]
        );
        expect(writableOccurrenceResult.rows[0]?.id).toBeTruthy();

        await expect(
          appClient.query(
            `INSERT INTO events (organization_id, name, event_type, start_date, end_date, created_by, modified_by)
             VALUES ($1, $2, 'community', NOW() + interval '3 day', NOW() + interval '3 day 2 hours', $3, $3)`,
            [secondaryOrganizationId, `RLS Rejected Event ${unique()}`, managerUserId]
          )
        ).rejects.toThrow(/row-level security|permission denied/i);

        await expect(
          appClient.query(
            `INSERT INTO event_occurrences (
               event_id,
               organization_id,
               sequence_index,
               scheduled_start_date,
               scheduled_end_date,
               start_date,
               end_date,
               status,
               event_name,
               created_by,
               modified_by
             )
             VALUES (
               $1,
               $2,
               99,
               NOW() + interval '3 day',
               NOW() + interval '3 day 2 hours',
               NOW() + interval '3 day',
               NOW() + interval '3 day 2 hours',
               'planned',
               $3,
               $4,
               $4
             )`,
            [blockedEventId, secondaryOrganizationId, blockedEventName, managerUserId]
          )
        ).rejects.toThrow(/row-level security|permission denied|must have an organization/i);
      } finally {
        await appClient.query('RESET app.current_user_id').catch(() => undefined);
        await appClient.end();
      }
    });
  });

  describe('POST /api/v2/events', () => {
    it('should create a new event with valid data', async () => {
      const response = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Annual Fundraiser Gala',
          event_type: 'fundraiser',
          start_date: '2024-06-15T18:00:00Z',
          end_date: '2024-06-15T23:00:00Z',
          location_name: '400 West Georgia Street, Vancouver, BC',
          description: 'Annual fundraising event',
          capacity: 200,
        })
        .expect(201);

      const event = unwrap<{ event_id: string; event_name: string; event_type: string }>(
        response.body
      );
      expect(response.body).toMatchObject({
        success: true,
        data: {
          event_id: expect.any(String),
          event_name: 'Annual Fundraiser Gala',
          event_type: 'fundraiser',
        },
        event_id: expect.any(String),
        event_name: 'Annual Fundraiser Gala',
        event_type: 'fundraiser',
      });
      expect(event).toHaveProperty('event_id');
      expect(event.event_name).toBe('Annual Fundraiser Gala');
      expect(event.event_type).toBe('fundraiser');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v2/events')
        .send({
          event_name: 'Test Event',
          event_type: 'volunteer',
          start_date: '2024-07-01T10:00:00Z',
          end_date: '2024-07-01T16:00:00Z',
        })
        .expect(401);

      expectCanonicalError(response, 'unauthorized');
    });

    it('should create event with required fields', async () => {
      const response = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Basic Event',
          event_type: 'meeting',
          start_date: '2024-08-01T10:00:00Z',
          end_date: '2024-08-01T12:00:00Z',
        })
        .expect(201);

      const event = unwrap<{ event_id: string; event_name: string; event_type: string }>(
        response.body
      );
      expect(response.body).toMatchObject({
        success: true,
        data: {
          event_id: expect.any(String),
          event_name: 'Basic Event',
          event_type: 'meeting',
        },
      });
      expect(event).toHaveProperty('event_id');
      expect(event.event_name).toBe('Basic Event');
      expect(event.event_type).toBe('meeting');
    });

    it('should create event with capacity', async () => {
      const response = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Limited Capacity Workshop',
          event_type: 'workshop',
          start_date: '2024-09-10T14:00:00Z',
          end_date: '2024-09-10T17:00:00Z',
          capacity: 30,
        })
        .expect(201);

      const event = unwrap<{ capacity: number }>(response.body);
      expect(event.capacity).toBe(30);
    });
  });

  describe('GET /api/v2/events', () => {
    it('should return paginated list of events', async () => {
      const searchTerm = `events-list-contract-${unique()}`;
      const createResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: searchTerm,
          event_type: 'community',
          start_date: '2026-05-01T10:00:00Z',
          end_date: '2026-05-01T12:00:00Z',
        })
        .expect(201);
      const createdEventId = unwrap<{ event_id: string }>(createResponse.body).event_id;

      const response = await request(app)
        .get('/api/v2/events')
        .query({ search: searchTerm })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = expectEventListPayload(response);
      expect(payload.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event_id: createdEventId,
            event_name: searchTerm,
          }),
        ])
      );
    });

    it('should support search query', async () => {
      const searchTerm = `events-search-contract-${unique()}`;
      const createResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: searchTerm,
          event_type: 'fundraiser',
          start_date: '2026-06-10T18:00:00Z',
          end_date: '2026-06-10T20:00:00Z',
          description: 'Search contract coverage event',
        })
        .expect(201);
      const createdEventId = unwrap<{ event_id: string }>(createResponse.body).event_id;

      const response = await request(app)
        .get('/api/v2/events')
        .query({ search: searchTerm })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = expectEventListPayload(response);
      expect(payload.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event_id: createdEventId,
            event_name: searchTerm,
          }),
        ])
      );
    });

    it('should filter by event_type', async () => {
      const includedResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: `events-type-included-${unique()}`,
          event_type: 'fundraiser',
          start_date: '2026-07-01T10:00:00Z',
          end_date: '2026-07-01T12:00:00Z',
        })
        .expect(201);
      const excludedResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: `events-type-excluded-${unique()}`,
          event_type: 'meeting',
          start_date: '2026-07-02T10:00:00Z',
          end_date: '2026-07-02T12:00:00Z',
        })
        .expect(201);
      const includedEventId = unwrap<{ event_id: string }>(includedResponse.body).event_id;
      const excludedEventId = unwrap<{ event_id: string }>(excludedResponse.body).event_id;

      const response = await request(app)
        .get('/api/v2/events')
        .query({ event_type: 'fundraiser' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = expectEventListPayload(response);
      expect(payload.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event_id: includedEventId,
            event_type: 'fundraiser',
          }),
        ])
      );
      expect(payload.data.map((event) => event.event_id)).not.toContain(excludedEventId);
    });

    it('should filter by date range', async () => {
      const inRangeResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: `events-range-included-${unique()}`,
          event_type: 'community',
          start_date: '2026-08-10T10:00:00Z',
          end_date: '2026-08-10T12:00:00Z',
        })
        .expect(201);
      const outOfRangeResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: `events-range-excluded-${unique()}`,
          event_type: 'community',
          start_date: '2026-10-10T10:00:00Z',
          end_date: '2026-10-10T12:00:00Z',
        })
        .expect(201);
      const inRangeEventId = unwrap<{ event_id: string }>(inRangeResponse.body).event_id;
      const outOfRangeEventId = unwrap<{ event_id: string }>(outOfRangeResponse.body).event_id;

      const response = await request(app)
        .get('/api/v2/events')
        .query({
          start_date: '2026-08-01',
          end_date: '2026-08-31',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = expectEventListPayload(response);
      expect(payload.data.map((event) => event.event_id)).toContain(inRangeEventId);
      expect(payload.data.map((event) => event.event_id)).not.toContain(outOfRangeEventId);
    });

    it('should filter by status', async () => {
      const plannedResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: `events-status-planned-${unique()}`,
          event_type: 'community',
          status: 'planned',
          start_date: '2026-09-01T10:00:00Z',
          end_date: '2026-09-01T12:00:00Z',
        })
        .expect(201);
      const activeResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: `events-status-active-${unique()}`,
          event_type: 'community',
          status: 'active',
          start_date: '2026-09-02T10:00:00Z',
          end_date: '2026-09-02T12:00:00Z',
        })
        .expect(201);
      const plannedEventId = unwrap<{ event_id: string }>(plannedResponse.body).event_id;
      const activeEventId = unwrap<{ event_id: string }>(activeResponse.body).event_id;

      const response = await request(app)
        .get('/api/v2/events')
        .query({ status: 'planned' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = expectEventListPayload(response);
      expect(payload.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event_id: plannedEventId,
            status: 'planned',
          }),
        ])
      );
      expect(payload.data.map((event) => event.event_id)).not.toContain(activeEventId);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/v2/events').expect(401);

      expectCanonicalError(response, 'unauthorized');
    });
  });

  describe('GET /api/v2/events/:id', () => {
    it('should return a single event by ID', async () => {
      const createResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Single Event Test',
          event_type: 'community',
          start_date: '2024-10-20T10:00:00Z',
          end_date: '2024-10-20T16:00:00Z',
          location_name: 'Community Center',
        })
        .expect(201);

      const created = unwrap<{ event_id: string }>(createResponse.body);
      const eventId = created.event_id;

      const response = await request(app)
        .get(`/api/v2/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const event = unwrap<{ event_id: string; event_name: string }>(response.body);
      expect(event.event_id).toBe(eventId);
      expect(event.event_name).toBe('Single Event Test');
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/v2/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expectCanonicalError(response, 'EVENT_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/v2/events/1').expect(401);

      expectCanonicalError(response, 'unauthorized');
    });
  });

  describe('GET /api/v2/events/:id/calendar.ics', () => {
    it('should return authenticated ICS download for an event', async () => {
      const createResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Calendar Contract Event',
          event_type: 'community',
          start_date: '2026-05-20T18:00:00Z',
          end_date: '2026-05-20T20:00:00Z',
          location_name: 'Community Hall',
          city: 'Vancouver',
          country: 'Canada',
        })
        .expect(201);

      const created = unwrap<{ event_id: string }>(createResponse.body);
      const eventId = created.event_id;

      const response = await request(app)
        .get(`/api/v2/events/${eventId}/calendar.ics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/calendar');
      expect(response.headers['content-disposition']).toContain('attachment;');
      expect(response.headers['content-disposition']).toContain(`event-${eventId}.ics`);
      expect(response.text).toContain('BEGIN:VCALENDAR');
      expect(response.text).toContain('BEGIN:VEVENT');
      expect(response.text).toContain(`UID:${eventId}@nonprofit-manager`);
    });

    it('should return canonical 404 when event for ICS is not found', async () => {
      const response = await request(app)
        .get('/api/v2/events/00000000-0000-0000-0000-000000000000/calendar.ics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'EVENT_NOT_FOUND',
          message: expect.any(String),
        },
      });
    });

    it('should require authentication for ICS download', async () => {
      const response = await request(app)
        .get('/api/v2/events/00000000-0000-0000-0000-000000000000/calendar.ics')
        .expect(401);

      expectCanonicalError(response, 'unauthorized');
    });
  });

  describe('PUT /api/v2/events/:id', () => {
    it('should update an existing event', async () => {
      const createResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Original Event',
          event_type: 'meeting',
          start_date: '2024-11-05T09:00:00Z',
          end_date: '2024-11-05T12:00:00Z',
        })
        .expect(201);

      const created = unwrap<{ event_id: string }>(createResponse.body);
      const eventId = created.event_id;

      const response = await request(app)
        .put(`/api/v2/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Updated Event Name',
          location_name: 'New Location',
          status: 'active',
        })
        .expect(200);

      const event = unwrap<{ event_name: string; location_name: string; status: string }>(
        response.body
      );
      expect(event.event_name).toBe('Updated Event Name');
      expect(event.location_name).toBe('New Location');
      expect(event.status).toBe('active');
    });

    it('should update event capacity', async () => {
      const createResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Capacity Test Event',
          event_type: 'workshop',
          start_date: '2024-12-01T14:00:00Z',
          end_date: '2024-12-01T17:00:00Z',
          capacity: 50,
        })
        .expect(201);

      const created = unwrap<{ event_id: string }>(createResponse.body);
      const eventId = created.event_id;

      const response = await request(app)
        .put(`/api/v2/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          capacity: 75,
        })
        .expect(200);

      const event = unwrap<{ capacity: number }>(response.body);
      expect(event.capacity).toBe(75);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/v2/events/1')
        .send({ event_name: 'Test' })
        .expect(401);

      expectCanonicalError(response, 'unauthorized');
    });
  });

  describe('DELETE /api/v2/events/:id', () => {
    it('should soft delete an event by setting status to cancelled', async () => {
      const createResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Event To Delete',
          event_type: 'other',
          start_date: '2025-01-15T10:00:00Z',
          end_date: '2025-01-15T14:00:00Z',
        })
        .expect(201);

      const created = unwrap<{ event_id: string }>(createResponse.body);
      const eventId = created.event_id;

      await request(app)
        .delete(`/api/v2/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      const response = await request(app)
        .get(`/api/v2/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const event = unwrap<{ status: string }>(response.body);
      expect(event.status).toBe('cancelled');
    });

    it('should require authentication', async () => {
      const response = await request(app).delete('/api/v2/events/1').expect(401);

      expectCanonicalError(response, 'unauthorized');
    });
  });

  describe('POST /api/v2/events/:id/check-in/scan', () => {
    it('checks in a registration by QR token', async () => {
      const createEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'QR Scan Check-In Event',
          event_type: 'community',
          start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;

      const contactResult = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ('QR', 'Tester', $1, NULL, NULL)
         RETURNING id`,
        [`qr-checkin-${unique()}@example.com`]
      );
      const contactId = contactResult.rows[0].id;
      createdContactIds.push(contactId);

      const registrationResponse = await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contact_id: contactId })
        .expect(201);

      const registration = unwrap<{ check_in_token: string }>(registrationResponse.body);
      expect(registration.check_in_token).toBeTruthy();

      const scanResponse = await request(app)
        .post(`/api/v2/events/${eventId}/check-in/scan`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: registration.check_in_token })
        .expect(200);

      const checkedIn = unwrap<{ checked_in: boolean; check_in_method: string }>(scanResponse.body);
      expect(checkedIn.checked_in).toBe(true);
      expect(checkedIn.check_in_method).toBe('qr');
    });
  });

  describe('GET /api/v2/events/registrations?contact_id=', () => {
    it('enforces account data scope filtering for contact registration listing', async () => {
      const dataScopeResult = await pool.query<{ id: string }>(
        `INSERT INTO data_scopes (name, resource, scope_filter, user_id, priority, is_active)
         VALUES ($1, 'events', $2::jsonb, $3, 1000, true)
         RETURNING id`,
        [
          `events-scope-${unique()}`,
          JSON.stringify({ accountIds: [organizationId] }),
          managerUserId,
        ]
      );
      createdDataScopeIds.push(dataScopeResult.rows[0].id);

      const contactResult = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ('Scoped', 'Registrant', $1, NULL, NULL)
         RETURNING id`,
        [`event-scope-contact-${unique()}@example.com`]
      );
      const contactId = contactResult.rows[0].id;
      createdContactIds.push(contactId);

      const allowedEventName = `Scope Allowed Event ${unique()}`;
      const allowedEventResult = await pool.query<{ id: string }>(
        `INSERT INTO events (organization_id, name, event_type, start_date, end_date, created_by, modified_by)
         VALUES ($1, $2, 'community', NOW() + interval '1 day', NOW() + interval '1 day 2 hours', $3, $3)
         RETURNING id`,
        [organizationId, allowedEventName, adminUserId]
      );
      const allowedEventId = allowedEventResult.rows[0].id;
      createdScopedEventIds.push(allowedEventId);
      const allowedOccurrenceId = await insertOccurrenceForEvent(
        allowedEventId,
        allowedEventName,
        adminUserId,
        organizationId
      );

      const blockedEventName = `Scope Blocked Event ${unique()}`;
      const blockedEventResult = await pool.query<{ id: string }>(
        `INSERT INTO events (organization_id, name, event_type, start_date, end_date, created_by, modified_by)
         VALUES ($1, $2, 'community', NOW() + interval '1 day', NOW() + interval '1 day 2 hours', $3, $3)
         RETURNING id`,
        [secondaryOrganizationId, blockedEventName, adminUserId]
      );
      const blockedEventId = blockedEventResult.rows[0].id;
      createdScopedEventIds.push(blockedEventId);
      const blockedOccurrenceId = await insertOccurrenceForEvent(
        blockedEventId,
        blockedEventName,
        adminUserId,
        secondaryOrganizationId
      );

      const allowedRegistrationResult = await pool.query<{ id: string }>(
        `INSERT INTO event_registrations (event_id, occurrence_id, contact_id, registration_status)
         VALUES ($1, $2, $3, 'registered')
         RETURNING id`,
        [allowedEventId, allowedOccurrenceId, contactId]
      );
      const allowedRegistrationId = allowedRegistrationResult.rows[0].id;
      createdScopedRegistrationIds.push(allowedRegistrationId);

      const blockedRegistrationResult = await pool.query<{ id: string }>(
        `INSERT INTO event_registrations (event_id, occurrence_id, contact_id, registration_status)
         VALUES ($1, $2, $3, 'registered')
         RETURNING id`,
        [blockedEventId, blockedOccurrenceId, contactId]
      );
      const blockedRegistrationId = blockedRegistrationResult.rows[0].id;
      createdScopedRegistrationIds.push(blockedRegistrationId);

      const response = await request(app)
        .get('/api/v2/events/registrations')
        .query({ contact_id: contactId })
        .set('Authorization', `Bearer ${managerAuthToken}`)
        .expect(200);

      const registrations = unwrap<Array<{ registration_id: string; event_id: string }>>(
        response.body
      );
      expect(registrations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            registration_id: allowedRegistrationId,
            event_id: allowedEventId,
          }),
        ])
      );
      expect(
        registrations.find((registration) => registration.registration_id === blockedRegistrationId)
      ).toBeUndefined();
      expect(registrations).toHaveLength(1);
    });
  });

  describe('PUT /api/v2/events/registrations/:id', () => {
    const createContact = async (label: string): Promise<string> => {
      const result = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ('${label}', 'Registrant', $1, NULL, NULL)
         RETURNING id`,
        [`${label.toLowerCase()}-${unique()}@example.com`]
      );

      const contactId = result.rows[0].id;
      createdContactIds.push(contactId);
      return contactId;
    };

    const createRecurringEvent = async (
      label: string,
      options: { capacity?: number; waitlistEnabled?: boolean; occurrenceCount?: number } = {}
    ): Promise<{ eventId: string }> => {
      const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const occurrenceCount = options.occurrenceCount ?? 3;
      const recurrenceEndDate = new Date(
        start.getTime() + ((occurrenceCount - 1) * 7 + 1) * 24 * 60 * 60 * 1000
      );

      const response = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: `${label} recurring event`,
          event_type: 'community',
          capacity: options.capacity ?? 5,
          waitlist_enabled: options.waitlistEnabled ?? true,
          is_recurring: true,
          recurrence_pattern: 'weekly',
          recurrence_interval: 1,
          recurrence_end_date: recurrenceEndDate.toISOString(),
          start_date: start.toISOString(),
          end_date: end.toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(response.body).event_id;
      createdScopedEventIds.push(eventId);
      return { eventId };
    };

    const listRegistrationsForContact = async (
      eventId: string,
      contactId: string
    ): Promise<
      Array<{
        registration_id: string;
        occurrence_id: string;
        series_enrollment_id: string | null;
        registration_status: string;
        notes: string | null;
      }>
    > => {
      const result = await pool.query<{
        registration_id: string;
        occurrence_id: string;
        series_enrollment_id: string | null;
        registration_status: string;
        notes: string | null;
      }>(
        `SELECT
           er.id as registration_id,
           er.occurrence_id,
           er.series_enrollment_id,
           er.registration_status,
           er.notes
         FROM event_registrations er
         INNER JOIN event_occurrences eo ON eo.id = er.occurrence_id
         WHERE er.event_id = $1
           AND er.contact_id = $2
         ORDER BY eo.start_date ASC`,
        [eventId, contactId]
      );

      createdScopedRegistrationIds.push(...result.rows.map((row) => row.registration_id));
      return result.rows;
    };

    it('updates status, notes, and linked case while recording activity and active counts', async () => {
      const createEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Registration Update Event',
          event_type: 'community',
          capacity: 5,
          start_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;

      const [primaryContactResult, otherContactResult] = await Promise.all([
        pool.query<{ id: string }>(
          `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
           VALUES ('Registration', 'Owner', $1, NULL, NULL)
           RETURNING id`,
          [`registration-owner-${unique()}@example.com`]
        ),
        pool.query<{ id: string }>(
          `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
           VALUES ('Registration', 'Other', $1, NULL, NULL)
           RETURNING id`,
          [`registration-other-${unique()}@example.com`]
        ),
      ]);
      const contactId = primaryContactResult.rows[0].id;
      const otherContactId = otherContactResult.rows[0].id;
      createdContactIds.push(contactId, otherContactId);

      const caseTypeResult = await pool.query<{ id: string }>(
        `SELECT id
         FROM case_types
         WHERE is_active = true
         ORDER BY created_at ASC
         LIMIT 1`
      );
      const caseStatusResult = await pool.query<{ id: string }>(
        `SELECT id
         FROM case_statuses
         WHERE is_active = true
         ORDER BY created_at ASC
         LIMIT 1`
      );

      const primaryCaseId = (
        await pool.query<{ id: string }>(
          `INSERT INTO cases (
             case_number,
             contact_id,
             account_id,
             case_type_id,
             status_id,
             title,
             created_by,
             modified_by
           ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $6)
           RETURNING id`,
          [
            `CASE-EVENT-${unique()}`,
            contactId,
            caseTypeResult.rows[0].id,
            caseStatusResult.rows[0].id,
            'Registration Update Case',
            adminUserId,
          ]
        )
      ).rows[0].id;
      const otherCaseId = (
        await pool.query<{ id: string }>(
          `INSERT INTO cases (
             case_number,
             contact_id,
             account_id,
             case_type_id,
             status_id,
             title,
             created_by,
             modified_by
           ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $6)
           RETURNING id`,
          [
            `CASE-EVENT-${unique()}`,
            otherContactId,
            caseTypeResult.rows[0].id,
            caseStatusResult.rows[0].id,
            'Other Contact Case',
            adminUserId,
          ]
        )
      ).rows[0].id;
      createdCaseIds.push(primaryCaseId, otherCaseId);

      const registrationResponse = await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: contactId,
          registration_status: 'waitlisted',
          notes: 'Initial waitlist note',
        })
        .expect(201);

      const registration = unwrap<{ registration_id: string }>(registrationResponse.body);
      createdScopedRegistrationIds.push(registration.registration_id);
      createdScopedEventIds.push(eventId);

      const updateResponse = await request(app)
        .put(`/api/v2/events/registrations/${registration.registration_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registration_status: 'confirmed',
          notes: 'Priority guest',
          case_id: primaryCaseId,
        })
        .expect(200);

      const updatedRegistration = unwrap<{
        registration_status: string;
        notes: string | null;
        case_id: string | null;
      }>(updateResponse.body);
      expect(updatedRegistration).toEqual(
        expect.objectContaining({
          registration_status: 'confirmed',
          notes: 'Priority guest',
          case_id: primaryCaseId,
        })
      );

      const eventCounts = await pool.query<{ registered_count: number }>(
        'SELECT registered_count FROM events WHERE id = $1',
        [eventId]
      );
      expect(eventCounts.rows[0].registered_count).toBe(1);

      const activityRows = await pool.query<{
        activity_type: string;
        actor_user_id: string | null;
        metadata: {
          previousStatus?: string;
          nextStatus?: string;
          caseId?: string;
          eventId?: string;
        };
      }>(
        `SELECT activity_type, actor_user_id, metadata
         FROM activity_events
         WHERE related_entity_type = 'contact'
           AND related_entity_id = $1::uuid
           AND activity_type = 'event_registration_updated'
         ORDER BY occurred_at DESC
         LIMIT 1`,
        [contactId]
      );

      expect(activityRows.rows[0]).toEqual(
        expect.objectContaining({
          activity_type: 'event_registration_updated',
          actor_user_id: adminUserId,
          metadata: expect.objectContaining({
            previousStatus: 'waitlisted',
            nextStatus: 'confirmed',
            caseId: primaryCaseId,
            eventId,
          }),
        })
      );

      const invalidCaseResponse = await request(app)
        .put(`/api/v2/events/registrations/${registration.registration_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ case_id: otherCaseId })
        .expect(400);

      expect(invalidCaseResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringMatching(/same contact/i),
        },
      });
    });

    it('accepts scope from the query string and rejects batch scope for single-occurrence registrations', async () => {
      const createEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Single-date registration scope event',
          event_type: 'community',
          capacity: 5,
          start_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;
      createdScopedEventIds.push(eventId);
      const contactId = await createContact('single-scope');

      const registrationResponse = await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: contactId,
        })
        .expect(201);

      const registrationId = unwrap<{ registration_id: string }>(
        registrationResponse.body
      ).registration_id;
      createdScopedRegistrationIds.push(registrationId);

      const queryScopeResponse = await request(app)
        .put(`/api/v2/events/registrations/${registrationId}?scope=future_occurrences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Needs follow-up' })
        .expect(400);

      expect(queryScopeResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringMatching(/single-occurrence/i),
        },
      });

      const bodyScopeResponse = await request(app)
        .put(`/api/v2/events/registrations/${registrationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Body scope should fail validation',
          scope: 'series',
        })
        .expect(400);

      expect(bodyScopeResponse.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
      expect(JSON.stringify(bodyScopeResponse.body)).toMatch(/scope/i);
    });

    it('updates future occurrence registrations from the selected occurrence forward', async () => {
      const { eventId } = await createRecurringEvent('future-scope');
      const contactId = await createContact('future-scope');

      await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: contactId,
          enrollment_scope: 'series',
        })
        .expect(201);

      const registrations = await listRegistrationsForContact(eventId, contactId);
      expect(registrations).toHaveLength(3);

      await request(app)
        .put(
          `/api/v2/events/registrations/${registrations[1].registration_id}?scope=future_occurrences`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registration_status: 'cancelled',
          notes: 'Paused after intake',
        })
        .expect(200);

      const updatedRegistrations = await listRegistrationsForContact(eventId, contactId);
      expect(updatedRegistrations.map((row) => row.registration_status)).toEqual([
        'registered',
        'cancelled',
        'cancelled',
      ]);
      expect(updatedRegistrations.map((row) => row.notes)).toEqual([
        null,
        'Paused after intake',
        'Paused after intake',
      ]);

      const occurrenceCounts = await pool.query<{ registered_count: number }>(
        `SELECT registered_count
         FROM event_occurrences
         WHERE event_id = $1
         ORDER BY start_date ASC`,
        [eventId]
      );
      expect(occurrenceCounts.rows.map((row) => row.registered_count)).toEqual([1, 0, 0]);
    });

    it('updates series enrollment status and notes when the series scope is used', async () => {
      const { eventId } = await createRecurringEvent('series-scope');
      const contactId = await createContact('series-scope');

      await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: contactId,
          enrollment_scope: 'series',
          notes: 'Original enrollment note',
        })
        .expect(201);

      const registrations = await listRegistrationsForContact(eventId, contactId);
      expect(registrations).toHaveLength(3);

      await request(app)
        .put(`/api/v2/events/registrations/${registrations[1].registration_id}?scope=series`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registration_status: 'waitlisted',
          notes: 'Updated enrollment note',
        })
        .expect(200);

      const updatedRegistrations = await listRegistrationsForContact(eventId, contactId);
      expect(updatedRegistrations.map((row) => row.registration_status)).toEqual([
        'registered',
        'waitlisted',
        'waitlisted',
      ]);

      const enrollmentState = await pool.query<{
        registration_status: string;
        notes: string | null;
        modified_by: string | null;
      }>(
        `SELECT registration_status, notes, modified_by
         FROM event_series_enrollments
         WHERE id = $1`,
        [registrations[1].series_enrollment_id]
      );

      expect(enrollmentState.rows[0]).toEqual({
        registration_status: 'waitlisted',
        notes: 'Updated enrollment note',
        modified_by: adminUserId,
      });
    });

    it('promotes waitlisted registrations when scoped cancellations free capacity', async () => {
      const { eventId } = await createRecurringEvent('promotion-scope', {
        capacity: 1,
        waitlistEnabled: true,
        occurrenceCount: 2,
      });
      const primaryContactId = await createContact('promotion-primary');
      const waitlistedContactId = await createContact('promotion-waitlist');

      await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: primaryContactId,
          enrollment_scope: 'series',
        })
        .expect(201);

      await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: waitlistedContactId,
          enrollment_scope: 'series',
        })
        .expect(201);

      const primaryRegistrations = await listRegistrationsForContact(eventId, primaryContactId);
      const waitlistedRegistrations = await listRegistrationsForContact(
        eventId,
        waitlistedContactId
      );

      expect(waitlistedRegistrations.map((row) => row.registration_status)).toEqual([
        'waitlisted',
        'waitlisted',
      ]);

      await request(app)
        .put(`/api/v2/events/registrations/${primaryRegistrations[0].registration_id}?scope=series`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registration_status: 'cancelled',
          notes: 'Unable to attend',
        })
        .expect(200);

      const updatedPrimaryRegistrations = await listRegistrationsForContact(
        eventId,
        primaryContactId
      );
      const promotedRegistrations = await listRegistrationsForContact(eventId, waitlistedContactId);

      expect(updatedPrimaryRegistrations.map((row) => row.registration_status)).toEqual([
        'cancelled',
        'cancelled',
      ]);
      expect(promotedRegistrations.map((row) => row.registration_status)).toEqual([
        'registered',
        'registered',
      ]);

      const occurrenceCounts = await pool.query<{ registered_count: number }>(
        `SELECT registered_count
         FROM event_occurrences
         WHERE event_id = $1
         ORDER BY start_date ASC`,
        [eventId]
      );
      expect(occurrenceCounts.rows.map((row) => row.registered_count)).toEqual([1, 1]);
    });
  });

  describe('check-in window and status guardrails', () => {
    it.each(['waitlisted', 'no_show'] as const)(
      'rejects manual and scan check-in for %s registrations',
      async (registrationStatus) => {
        const createEventResponse = await request(app)
          .post('/api/v2/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            event_name: `${registrationStatus} Registration Guardrail Event`,
            event_type: 'community',
            start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          })
          .expect(201);

        const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;
        createdScopedEventIds.push(eventId);

        const contactResult = await pool.query<{ id: string }>(
          `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
           VALUES ('Guardrail', 'Registration', $1, NULL, NULL)
           RETURNING id`,
          [`registration-guardrail-${registrationStatus}-${unique()}@example.com`]
        );
        const contactId = contactResult.rows[0].id;
        createdContactIds.push(contactId);

        const registrationResponse = await request(app)
          .post(`/api/v2/events/${eventId}/register`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            contact_id: contactId,
            registration_status: registrationStatus,
          })
          .expect(201);

        const registration = unwrap<{ registration_id: string; check_in_token: string }>(
          registrationResponse.body
        );
        createdScopedRegistrationIds.push(registration.registration_id);

        const manualResponse = await request(app)
          .post(`/api/v2/events/registrations/${registration.registration_id}/check-in`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(manualResponse.body).toMatchObject({
          success: false,
          error: {
            code: 'CHECKIN_ERROR',
            message: expect.stringMatching(/cannot be checked in/i),
          },
        });

        const scanResponse = await request(app)
          .post(`/api/v2/events/${eventId}/check-in/scan`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ token: registration.check_in_token })
          .expect(400);

        expect(scanResponse.body).toMatchObject({
          success: false,
          error: {
            code: 'CHECKIN_ERROR',
            message: expect.stringMatching(/cannot be checked in/i),
          },
        });
      }
    );

    it('rejects manual check-in before the event window opens', async () => {
      const createEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Window Guardrail Event',
          event_type: 'community',
          start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;

      const contactResult = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ('Window', 'Tester', $1, NULL, NULL)
         RETURNING id`,
        [`window-checkin-${unique()}@example.com`]
      );
      const contactId = contactResult.rows[0].id;
      createdContactIds.push(contactId);

      const registrationResponse = await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contact_id: contactId })
        .expect(201);

      const registration = unwrap<{ registration_id: string }>(registrationResponse.body);

      const checkInResponse = await request(app)
        .post(`/api/v2/events/registrations/${registration.registration_id}/check-in`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(checkInResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'CHECKIN_ERROR',
          message: expect.stringMatching(/Check-in is available/i),
        },
      });
    });

    it('rejects manual check-in after the event window closes', async () => {
      const createEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'After Window Guardrail Event',
          event_type: 'community',
          start_date: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;

      const contactResult = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ('After', 'Window', $1, NULL, NULL)
         RETURNING id`,
        [`after-window-checkin-${unique()}@example.com`]
      );
      const contactId = contactResult.rows[0].id;
      createdContactIds.push(contactId);

      const registrationResponse = await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contact_id: contactId })
        .expect(201);

      const registration = unwrap<{ registration_id: string }>(registrationResponse.body);

      const checkInResponse = await request(app)
        .post(`/api/v2/events/registrations/${registration.registration_id}/check-in`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(checkInResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'CHECKIN_ERROR',
          message: expect.stringMatching(/Check-in is available/i),
        },
      });
    });

    it.each(['cancelled', 'completed'] as const)(
      'rejects manual check-in for %s events',
      async (status) => {
        const createEventResponse = await request(app)
          .post('/api/v2/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            event_name: `${status} Manual Guardrail Event`,
            event_type: 'community',
            status,
            start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          })
          .expect(201);

        const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;

        const contactResult = await pool.query<{ id: string }>(
          `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
           VALUES ('Status', 'Manual', $1, NULL, NULL)
           RETURNING id`,
          [`status-manual-${status}-${unique()}@example.com`]
        );
        const contactId = contactResult.rows[0].id;
        createdContactIds.push(contactId);

        const registrationResponse = await request(app)
          .post(`/api/v2/events/${eventId}/register`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ contact_id: contactId })
          .expect(201);

        const registration = unwrap<{ registration_id: string }>(registrationResponse.body);

        const checkInResponse = await request(app)
          .post(`/api/v2/events/registrations/${registration.registration_id}/check-in`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(checkInResponse.body).toMatchObject({
          success: false,
          error: {
            code: 'CHECKIN_ERROR',
            message: expect.stringMatching(/not accepting check-ins/i),
          },
        });
      }
    );

    it.each(['cancelled', 'completed'] as const)(
      'rejects token scan check-in for %s events',
      async (status) => {
        const createEventResponse = await request(app)
          .post('/api/v2/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            event_name: `${status} Scan Guardrail Event`,
            event_type: 'community',
            status,
            start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          })
          .expect(201);

        const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;

        const contactResult = await pool.query<{ id: string }>(
          `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
           VALUES ('Status', 'Scan', $1, NULL, NULL)
           RETURNING id`,
          [`status-scan-${status}-${unique()}@example.com`]
        );
        const contactId = contactResult.rows[0].id;
        createdContactIds.push(contactId);

        const registrationResponse = await request(app)
          .post(`/api/v2/events/${eventId}/register`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ contact_id: contactId })
          .expect(201);

        const registration = unwrap<{ check_in_token: string }>(registrationResponse.body);

        const scanResponse = await request(app)
          .post(`/api/v2/events/${eventId}/check-in/scan`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ token: registration.check_in_token })
          .expect(400);

        expect(scanResponse.body).toMatchObject({
          success: false,
          error: {
            code: 'CHECKIN_ERROR',
            message: expect.stringMatching(/not accepting check-ins/i),
          },
        });
      }
    );

    it('rejects global token scan when the event check-in window is closed', async () => {
      const createEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Global Scan After Window Guardrail Event',
          event_type: 'community',
          start_date: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;

      const contactResult = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ('Global', 'Window', $1, NULL, NULL)
         RETURNING id`,
        [`global-window-checkin-${unique()}@example.com`]
      );
      const contactId = contactResult.rows[0].id;
      createdContactIds.push(contactId);

      const registrationResponse = await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contact_id: contactId })
        .expect(201);

      const registration = unwrap<{ check_in_token: string }>(registrationResponse.body);

      const scanResponse = await request(app)
        .post('/api/v2/events/check-in/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: registration.check_in_token })
        .expect(400);

      expect(scanResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'CHECKIN_ERROR',
          message: expect.stringMatching(/Check-in is available/i),
        },
      });
    });

    it('supports global token scan endpoint for staff check-in desks', async () => {
      const createEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Global Scan Event',
          event_type: 'community',
          start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;

      const contactResult = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ('Global', 'Scanner', $1, NULL, NULL)
         RETURNING id`,
        [`global-scan-${unique()}@example.com`]
      );
      const contactId = contactResult.rows[0].id;
      createdContactIds.push(contactId);

      const registrationResponse = await request(app)
        .post(`/api/v2/events/${eventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contact_id: contactId })
        .expect(201);

      const registration = unwrap<{ check_in_token: string }>(registrationResponse.body);

      const scanResponse = await request(app)
        .post('/api/v2/events/check-in/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: registration.check_in_token })
        .expect(200);

      const checkedIn = unwrap<{ checked_in: boolean; check_in_method: string }>(scanResponse.body);
      expect(checkedIn.checked_in).toBe(true);
      expect(checkedIn.check_in_method).toBe('qr');
    });
  });

  describe('public events catalog', () => {
    const createTemplateForUser = async (userId: string, name: string): Promise<string> => {
      const templateResult = await pool.query<{ id: string }>(
        `INSERT INTO templates (user_id, name, description, category, tags, theme, global_settings, metadata)
         VALUES ($1, $2, $3, 'multi-page', '{}'::text[], '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
         RETURNING id`,
        [userId, name, `${name} description`]
      );
      const templateId = templateResult.rows[0].id;
      createdTemplateIds.push(templateId);
      return templateId;
    };

    const createPublishedSite = async (args: {
      userId: string;
      templateId: string;
      subdomain: string;
      status?: 'draft' | 'published';
    }): Promise<string> => {
      const result = await pool.query<{ id: string }>(
        `INSERT INTO published_sites (
          user_id,
          template_id,
          name,
          subdomain,
          status,
          published_content,
          published_version,
          published_at
        ) VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, 'v1', NOW())
        RETURNING id`,
        [
          args.userId,
          args.templateId,
          `${args.subdomain} site`,
          args.subdomain,
          args.status ?? 'published',
        ]
      );
      const siteId = result.rows[0].id;
      createdSiteIds.push(siteId);
      return siteId;
    };

    it('returns owner-scoped public events and supports include_past/type/search filters', async () => {
      const adminTemplateId = await createTemplateForUser(
        adminUserId,
        `public-catalog-admin-${unique()}`
      );
      const managerTemplateId = await createTemplateForUser(
        managerUserId,
        `public-catalog-manager-${unique()}`
      );
      const adminSiteKey = `evtpub-a-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const managerSiteKey = `evtpub-b-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

      await createPublishedSite({
        userId: adminUserId,
        templateId: adminTemplateId,
        subdomain: adminSiteKey,
      });
      await createPublishedSite({
        userId: managerUserId,
        templateId: managerTemplateId,
        subdomain: managerSiteKey,
      });

      const upcomingFundraiserResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Alpha Fundraiser Upcoming',
          event_type: 'fundraiser',
          is_public: true,
          start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
          ).toISOString(),
        })
        .expect(201);
      const upcomingFundraiserId = unwrap<{ event_id: string }>(
        upcomingFundraiserResponse.body
      ).event_id;
      createdScopedEventIds.push(upcomingFundraiserId);

      const pastFundraiserResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Alpha Fundraiser Past',
          event_type: 'fundraiser',
          is_public: true,
          start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
          ).toISOString(),
        })
        .expect(201);
      const pastFundraiserId = unwrap<{ event_id: string }>(pastFundraiserResponse.body).event_id;
      createdScopedEventIds.push(pastFundraiserId);

      const privateEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Alpha Private Event',
          event_type: 'fundraiser',
          is_public: false,
          start_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(
            Date.now() + 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
          ).toISOString(),
        })
        .expect(201);
      const privateEventId = unwrap<{ event_id: string }>(privateEventResponse.body).event_id;
      createdScopedEventIds.push(privateEventId);

      const managerEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${managerAuthToken}`)
        .send({
          event_name: 'Beta Fundraiser',
          event_type: 'fundraiser',
          is_public: true,
          start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
          ).toISOString(),
        })
        .expect(201);
      const managerEventId = unwrap<{ event_id: string }>(managerEventResponse.body).event_id;
      createdScopedEventIds.push(managerEventId);

      const noPastResponse = await request(app)
        .get(`/api/v2/public/events/sites/${adminSiteKey}`)
        .query({
          event_type: 'fundraiser',
          search: 'Alpha',
          limit: 10,
          offset: 0,
        })
        .expect(200);

      const noPastData = unwrap<{
        items: Array<{ event_id: string }>;
        page: { has_more: boolean; total: number };
        site: { subdomain: string | null };
      }>(noPastResponse.body);

      expect(noPastData.site.subdomain).toBe(adminSiteKey);
      expect(noPastData.items.map((item) => item.event_id)).toContain(upcomingFundraiserId);
      expect(noPastData.items.map((item) => item.event_id)).not.toContain(pastFundraiserId);
      expect(noPastData.items.map((item) => item.event_id)).not.toContain(privateEventId);
      expect(noPastData.items.map((item) => item.event_id)).not.toContain(managerEventId);
      expect(noPastData.page.total).toBeGreaterThanOrEqual(1);

      const withPastResponse = await request(app)
        .get(`/api/v2/public/events/sites/${adminSiteKey}`)
        .query({
          event_type: 'fundraiser',
          include_past: true,
          search: 'Alpha',
          limit: 10,
          offset: 0,
        })
        .expect(200);

      const withPastData = unwrap<{ items: Array<{ event_id: string }> }>(withPastResponse.body);
      expect(withPastData.items.map((item) => item.event_id)).toEqual(
        expect.arrayContaining([upcomingFundraiserId, pastFundraiserId])
      );
    });

    it('resolves site by host for /api/v2/public/events', async () => {
      const templateId = await createTemplateForUser(adminUserId, `public-host-${unique()}`);
      const siteKey = `evtpub-host-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await createPublishedSite({ userId: adminUserId, templateId, subdomain: siteKey });

      const eventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Host Resolved Meeting',
          event_type: 'meeting',
          is_public: true,
          start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
        })
        .expect(201);
      const eventId = unwrap<{ event_id: string }>(eventResponse.body).event_id;
      createdScopedEventIds.push(eventId);

      const response = await request(app)
        .get('/api/v2/public/events')
        .set('Host', `${siteKey}.nonprofit.test`)
        .query({
          event_type: 'meeting',
          limit: 5,
          offset: 0,
        })
        .expect(200);

      const data = unwrap<{
        items: Array<{ event_id: string }>;
        site: { subdomain: string | null };
      }>(response.body);
      expect(data.site.subdomain).toBe(siteKey);
      expect(data.items.map((item) => item.event_id)).toContain(eventId);
    });

    it('returns 404 for missing published site and rejects invalid public query', async () => {
      await request(app).get('/api/v2/public/events/sites/does-not-exist').expect(404);

      const invalidQueryResponse = await request(app)
        .get('/api/v2/public/events/sites/does-not-exist')
        .query({ limit: 0, sort_by: 'status' })
        .expect(400);

      expect(invalidQueryResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'validation_error',
        },
      });
    });
  });

  describe('public kiosk check-in', () => {
    it('supports kiosk metadata, check-in success, wrong PIN rejection, and idempotency', async () => {
      const createEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Public Kiosk Event',
          event_type: 'community',
          is_public: true,
          start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;
      createdScopedEventIds.push(eventId);

      const rotateResponse = await request(app)
        .post(`/api/v2/events/${eventId}/check-in/pin/rotate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const rotated = unwrap<{ pin: string }>(rotateResponse.body);
      expect(rotated.pin).toMatch(/^\d{6}$/);

      const infoResponse = await request(app)
        .get(`/api/v2/public/events/${eventId}/check-in`)
        .expect(200);
      const info = unwrap<{
        event_id: string;
        public_checkin_enabled: boolean;
        checkin_open: boolean;
      }>(infoResponse.body);
      expect(info.event_id).toBe(eventId);
      expect(info.public_checkin_enabled).toBe(true);
      expect(info.checkin_open).toBe(true);

      const attendeeEmail = `public-kiosk-${unique()}@example.com`;

      const checkInResponse = await request(app)
        .post(`/api/v2/public/events/${eventId}/check-in`)
        .send({
          first_name: 'Public',
          last_name: 'Attendee',
          email: attendeeEmail,
          pin: rotated.pin,
        })
        .expect(201);

      const checkedIn = unwrap<{ status: string; contact_id: string }>(checkInResponse.body);
      expect(checkedIn.status).toBe('checked_in');
      createdContactIds.push(checkedIn.contact_id);

      const wrongPinResponse = await request(app)
        .post(`/api/v2/public/events/${eventId}/check-in`)
        .send({
          first_name: 'Public',
          last_name: 'Attendee',
          email: `public-kiosk-bad-pin-${unique()}@example.com`,
          pin: '000000',
        })
        .expect(403);
      expect(wrongPinResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_PIN',
        },
      });

      const idempotentSecondResponse = await request(app)
        .post(`/api/v2/public/events/${eventId}/check-in`)
        .send({
          first_name: 'Public',
          last_name: 'Attendee',
          email: attendeeEmail,
          pin: rotated.pin,
        })
        .expect(200);
      const idempotentSecond = unwrap<{ status: string }>(idempotentSecondResponse.body);
      expect(idempotentSecond.status).toBe('already_checked_in');
    });

    it('supports recurring kiosk check-in for an explicit occurrence', async () => {
      const now = Date.now();
      const createEventResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Recurring Public Kiosk Event',
          event_type: 'community',
          is_public: true,
          is_recurring: true,
          recurrence_pattern: 'weekly',
          recurrence_interval: 1,
          recurrence_end_date: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
          start_date: new Date(now + 60 * 60 * 1000).toISOString(),
          end_date: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;
      createdScopedEventIds.push(eventId);

      const detailResponse = await request(app)
        .get(`/api/v2/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const detail = unwrap<{
        next_occurrence_id?: string | null;
        occurrences?: Array<{ occurrence_id: string }>;
      }>(detailResponse.body);
      const occurrenceId = detail.next_occurrence_id || detail.occurrences?.[0]?.occurrence_id;
      expect(occurrenceId).toBeTruthy();

      const rotateResponse = await request(app)
        .post(`/api/v2/events/${eventId}/check-in/pin/rotate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ occurrence_id: occurrenceId })
        .expect(200);
      const rotated = unwrap<{ pin: string }>(rotateResponse.body);
      expect(rotated.pin).toMatch(/^\d{6}$/);

      const infoResponse = await request(app)
        .get(`/api/v2/public/events/${eventId}/check-in`)
        .query({ occurrence_id: occurrenceId })
        .expect(200);
      const info = unwrap<{
        event_id: string;
        occurrence_id: string;
        public_checkin_enabled: boolean;
      }>(infoResponse.body);
      expect(info.event_id).toBe(eventId);
      expect(info.occurrence_id).toBe(occurrenceId);
      expect(info.public_checkin_enabled).toBe(true);

      const attendeeEmail = `public-kiosk-recurring-${unique()}@example.com`;
      const checkInResponse = await request(app)
        .post(`/api/v2/public/events/${eventId}/check-in`)
        .send({
          occurrence_id: occurrenceId,
          first_name: 'Recurring',
          last_name: 'Attendee',
          email: attendeeEmail,
          pin: rotated.pin,
        })
        .expect(201);

      const checkedIn = unwrap<{ status: string; contact_id: string }>(checkInResponse.body);
      expect(checkedIn.status).toBe('checked_in');
      createdContactIds.push(checkedIn.contact_id);
    });

    it.each(['waitlisted', 'no_show'] as const)(
      'rejects kiosk check-in for %s registrations',
      async (registrationStatus) => {
        const createEventResponse = await request(app)
          .post('/api/v2/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            event_name: `Public ${registrationStatus} Event`,
            event_type: 'community',
            is_public: true,
            start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          })
          .expect(201);

        const eventId = unwrap<{ event_id: string }>(createEventResponse.body).event_id;
        createdScopedEventIds.push(eventId);

        const rotateResponse = await request(app)
          .post(`/api/v2/events/${eventId}/check-in/pin/rotate`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        const rotated = unwrap<{ pin: string }>(rotateResponse.body);
        const blockedEmail = `public-blocked-${registrationStatus}-${unique()}@example.com`;

        const contactResult = await pool.query<{ id: string }>(
          `INSERT INTO contacts (
             account_id,
             first_name,
             last_name,
             email,
             created_by,
             modified_by
           )
           VALUES ($1, 'Public', 'Blocked', $2, $3, $3)
           RETURNING id`,
          [organizationId, blockedEmail, adminUserId]
        );
        const contactId = contactResult.rows[0].id;
        createdContactIds.push(contactId);
        const occurrenceId = await getFirstOccurrenceId(eventId);

        const registrationResult = await pool.query<{ id: string }>(
          `INSERT INTO event_registrations (event_id, occurrence_id, contact_id, registration_status)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [eventId, occurrenceId, contactId, registrationStatus]
        );
        createdScopedRegistrationIds.push(registrationResult.rows[0].id);

        const response = await request(app)
          .post(`/api/v2/public/events/${eventId}/check-in`)
          .send({
            first_name: 'Public',
            last_name: 'Blocked',
            email: blockedEmail,
            pin: rotated.pin,
          })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'CHECKIN_ERROR',
            message: expect.stringMatching(/cannot be checked in/i),
          },
        });
      }
    );
  });
});
