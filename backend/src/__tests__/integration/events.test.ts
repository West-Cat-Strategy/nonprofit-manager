import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Event API Integration Tests', () => {
  let authToken: string;
  let testEventId: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
    await pool.end();
  });

  describe('POST /api/events', () => {
    it('should create a new event with valid data', async () => {
      const response = await request(app)
        .post('/api/events')
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

      expect(response.body).toHaveProperty('event_id');
      expect(response.body.event_name).toBe('Annual Fundraiser Gala');
      expect(response.body.event_type).toBe('fundraiser');
      testEventId = response.body.event_id;
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/events')
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
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Basic Event',
          event_type: 'meeting',
          start_date: '2024-08-01T10:00:00Z',
          end_date: '2024-08-01T12:00:00Z',
        })
        .expect(201);

      expect(response.body).toHaveProperty('event_id');
    });

    it('should create event with capacity', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Limited Capacity Workshop',
          event_type: 'workshop',
          start_date: '2024-09-10T14:00:00Z',
          end_date: '2024-09-10T17:00:00Z',
          capacity: 30,
        })
        .expect(201);

      expect(response.body.capacity).toBe(30);
    });
  });

  describe('GET /api/events', () => {
    it('should return paginated list of events', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support search query', async () => {
      const response = await request(app)
        .get('/api/events?search=Gala')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by event_type', async () => {
      const response = await request(app)
        .get('/api/events?event_type=fundraiser')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/events?start_date=2024-01-01&end_date=2024-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/events?status=planned')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/events').expect(401);
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return a single event by ID', async () => {
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Single Event Test',
          event_type: 'community',
          start_date: '2024-10-20T10:00:00Z',
          end_date: '2024-10-20T16:00:00Z',
          location_name: 'Community Center',
        });

      const eventId = createResponse.body.event_id;

      const response = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.event_id).toBe(eventId);
      expect(response.body.event_name).toBe('Single Event Test');
    });

    it('should return 404 for non-existent event', async () => {
      await request(app)
        .get('/api/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/events/1').expect(401);
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update an existing event', async () => {
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Original Event',
          event_type: 'meeting',
          start_date: '2024-11-05T09:00:00Z',
          end_date: '2024-11-05T12:00:00Z',
        });

      const eventId = createResponse.body.event_id;

      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Updated Event Name',
          location_name: 'New Location',
          status: 'active',
        })
        .expect(200);

      expect(response.body.event_name).toBe('Updated Event Name');
      expect(response.body.location_name).toBe('New Location');
      expect(response.body.status).toBe('active');
    });

    it('should update event capacity', async () => {
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Capacity Test Event',
          event_type: 'workshop',
          start_date: '2024-12-01T14:00:00Z',
          end_date: '2024-12-01T17:00:00Z',
          capacity: 50,
        });

      const eventId = createResponse.body.event_id;

      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          capacity: 75,
        })
        .expect(200);

      expect(response.body.capacity).toBe(75);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/events/1')
        .send({ event_name: 'Test' })
        .expect(401);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should soft delete an event by setting status to cancelled', async () => {
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_name: 'Event To Delete',
          event_type: 'other',
          start_date: '2025-01-15T10:00:00Z',
          end_date: '2025-01-15T14:00:00Z',
        });

      const eventId = createResponse.body.event_id;

      await request(app)
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      const response = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('cancelled');
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/events/1').expect(401);
    });
  });
});
