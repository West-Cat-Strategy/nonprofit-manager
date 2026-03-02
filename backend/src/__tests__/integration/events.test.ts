import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Event API Integration Tests', () => {
  let authToken: string;
  let testEventId: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

  beforeAll(async () => {
    // Register and login
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `event-test-${unique()}@example.com`,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Event',
        last_name: 'Tester',
      });

    authToken = registerResponse.body.token;
  });

  afterAll(async () => {
    // Clean up
    if (testEventId) {
      await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
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
      testEventId = event.event_id;
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
        });

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
        });

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
        });

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
        });

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
});
