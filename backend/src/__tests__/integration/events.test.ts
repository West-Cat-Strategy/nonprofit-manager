import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Event API Integration Tests', () => {
  let authToken: string;
  let adminUserId: string;
  let managerAuthToken: string;
  let managerUserId: string;
  const createdContactIds: string[] = [];
  const createdScopedEventIds: string[] = [];
  const createdScopedRegistrationIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdTemplateIds: string[] = [];
  const createdSiteIds: string[] = [];
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

  beforeAll(async () => {
    const adminEmail = `event-admin-${unique()}@example.com`;
    const adminUserResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Event', 'Tester', 'admin', NOW(), NOW())
       RETURNING id`,
      [adminEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );

    adminUserId = adminUserResult.rows[0].id;
    authToken = jwt.sign({ id: adminUserId, email: adminEmail, role: 'admin' }, getJwtSecret(), {
      expiresIn: '1h',
    });

    const managerEmail = `event-manager-${unique()}@example.com`;
    const managerUserResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Event', 'Manager', 'manager', NOW(), NOW())
       RETURNING id`,
      [managerEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    managerUserId = managerUserResult.rows[0].id;
    managerAuthToken = jwt.sign(
      { id: managerUserId, email: managerEmail, role: 'manager' },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
    createdUserIds.push(managerUserId);
  });

  afterAll(async () => {
    if (createdScopedRegistrationIds.length > 0) {
      await pool.query('DELETE FROM event_registrations WHERE id = ANY($1::uuid[])', [
        createdScopedRegistrationIds,
      ]);
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
      await pool.query('DELETE FROM template_pages WHERE template_id = ANY($1::uuid[])', [createdTemplateIds]);
      await pool.query('DELETE FROM templates WHERE id = ANY($1::uuid[])', [createdTemplateIds]);
    }

    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
    }

    if (adminUserId) {
      await pool.query('DELETE FROM events WHERE created_by = $1 OR modified_by = $1', [adminUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    }
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
          location_name: '123 Main St, City, State',
          description: 'Annual fundraising event',
          capacity: 200,
        })
        .expect(201);

      const event = unwrap<{ event_id: string; event_name: string; event_type: string }>(response.body);
      expect(event).toHaveProperty('event_id');
      expect(event.event_name).toBe('Annual Fundraiser Gala');
      expect(event.event_type).toBe('fundraiser');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v2/events')
        .send({
          event_name: 'Test Event',
          event_type: 'volunteer',
          start_date: '2024-07-01T10:00:00Z',
          end_date: '2024-07-01T16:00:00Z',
        })
        .expect(401);
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

      const event = unwrap<{ event_id: string }>(response.body);
      expect(event).toHaveProperty('event_id');
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
      const response = await request(app)
        .get('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = unwrap<{ data: unknown[]; pagination: unknown }>(response.body);
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('pagination');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should support search query', async () => {
      const response = await request(app)
        .get('/api/v2/events?search=Gala')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = unwrap<{ data: unknown[] }>(response.body);
      expect(payload).toHaveProperty('data');
    });

    it('should filter by event_type', async () => {
      const response = await request(app)
        .get('/api/v2/events?event_type=fundraiser')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = unwrap<{ data: unknown[] }>(response.body);
      expect(payload).toHaveProperty('data');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/v2/events?start_date=2024-01-01&end_date=2024-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = unwrap<{ data: unknown[] }>(response.body);
      expect(payload).toHaveProperty('data');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v2/events?status=planned')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = unwrap<{ data: unknown[] }>(response.body);
      expect(payload).toHaveProperty('data');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/events').expect(401);
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
      await request(app)
        .get('/api/v2/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/events/1').expect(401);
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

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
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

      const event = unwrap<{ event_name: string; location_name: string; status: string }>(response.body);
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
      await request(app)
        .put('/api/v2/events/1')
        .send({ event_name: 'Test' })
        .expect(401);
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
      await request(app).delete('/api/v2/events/1').expect(401);
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
    it('enforces created_by data scope filtering for contact registration listing', async () => {
      const outOfScopeCreator = await pool.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
         VALUES ($1, $2, 'Scope', 'Blocked', 'staff', NOW(), NOW())
         RETURNING id`,
        [
          `event-scope-blocked-${unique()}@example.com`,
          '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG',
        ]
      );
      const outOfScopeCreatorId = outOfScopeCreator.rows[0].id;
      createdUserIds.push(outOfScopeCreatorId);

      await pool.query(
        `INSERT INTO data_scopes (name, resource, scope_filter, user_id, priority, is_active)
         VALUES ($1, 'events', $2::jsonb, $3, 1000, true)`,
        [
          `events-scope-${unique()}`,
          JSON.stringify({ createdByUserIds: [adminUserId] }),
          managerUserId,
        ]
      );

      const contactResult = await pool.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
         VALUES ('Scoped', 'Registrant', $1, NULL, NULL)
         RETURNING id`,
        [`event-scope-contact-${unique()}@example.com`]
      );
      const contactId = contactResult.rows[0].id;
      createdContactIds.push(contactId);

      const allowedEventResult = await pool.query<{ id: string }>(
        `INSERT INTO events (name, event_type, start_date, end_date, created_by, modified_by)
         VALUES ($1, 'community', NOW() + interval '1 day', NOW() + interval '1 day 2 hours', $2, $2)
         RETURNING id`,
        [`Scope Allowed Event ${unique()}`, adminUserId]
      );
      const allowedEventId = allowedEventResult.rows[0].id;
      createdScopedEventIds.push(allowedEventId);

      const blockedEventResult = await pool.query<{ id: string }>(
        `INSERT INTO events (name, event_type, start_date, end_date, created_by, modified_by)
         VALUES ($1, 'community', NOW() + interval '1 day', NOW() + interval '1 day 2 hours', $2, $2)
         RETURNING id`,
        [`Scope Blocked Event ${unique()}`, outOfScopeCreatorId]
      );
      const blockedEventId = blockedEventResult.rows[0].id;
      createdScopedEventIds.push(blockedEventId);

      const allowedRegistrationResult = await pool.query<{ id: string }>(
        `INSERT INTO event_registrations (event_id, contact_id, registration_status)
         VALUES ($1, $2, 'registered')
         RETURNING id`,
        [allowedEventId, contactId]
      );
      const allowedRegistrationId = allowedRegistrationResult.rows[0].id;
      createdScopedRegistrationIds.push(allowedRegistrationId);

      const blockedRegistrationResult = await pool.query<{ id: string }>(
        `INSERT INTO event_registrations (event_id, contact_id, registration_status)
         VALUES ($1, $2, 'registered')
         RETURNING id`,
        [blockedEventId, contactId]
      );
      const blockedRegistrationId = blockedRegistrationResult.rows[0].id;
      createdScopedRegistrationIds.push(blockedRegistrationId);

      const response = await request(app)
        .get('/api/v2/events/registrations')
        .query({ contact_id: contactId })
        .set('Authorization', `Bearer ${managerAuthToken}`)
        .expect(200);

      const registrations = unwrap<Array<{ registration_id: string; event_id: string }>>(response.body);
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

  describe('check-in window and status guardrails', () => {
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
        [args.userId, args.templateId, `${args.subdomain} site`, args.subdomain, args.status ?? 'published']
      );
      const siteId = result.rows[0].id;
      createdSiteIds.push(siteId);
      return siteId;
    };

    it('returns owner-scoped public events and supports include_past/type/search filters', async () => {
      const adminTemplateId = await createTemplateForUser(adminUserId, `public-catalog-admin-${unique()}`);
      const managerTemplateId = await createTemplateForUser(managerUserId, `public-catalog-manager-${unique()}`);
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
          end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);
      const upcomingFundraiserId = unwrap<{ event_id: string }>(upcomingFundraiserResponse.body).event_id;
      createdScopedEventIds.push(upcomingFundraiserId);

      const pastFundraiserResponse = await request(app)
        .post('/api/v2/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Alpha Fundraiser Past',
          event_type: 'fundraiser',
          is_public: true,
          start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
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
          end_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
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
          end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
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

      const data = unwrap<{ items: Array<{ event_id: string }>; site: { subdomain: string | null } }>(
        response.body
      );
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

      const rotateResponse = await request(app)
        .post(`/api/v2/events/${eventId}/check-in/pin/rotate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const rotated = unwrap<{ pin: string }>(rotateResponse.body);
      expect(rotated.pin).toMatch(/^\d{6}$/);

      const infoResponse = await request(app)
        .get(`/api/v2/public/events/${eventId}/check-in`)
        .expect(200);
      const info = unwrap<{ event_id: string; public_checkin_enabled: boolean; checkin_open: boolean }>(
        infoResponse.body
      );
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
  });
});
