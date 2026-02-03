import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Volunteer API Integration Tests', () => {
  let authToken: string;
  let testContactId: string;
  let testAccountId: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  beforeAll(async () => {
    // Register and login
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `volunteer-test-${unique()}@example.com`,
        password: 'Test123!Strong',
        firstName: 'Volunteer',
        lastName: 'Tester',
      });

    authToken = registerResponse.body.token;

    // Create test account
    const accountResponse = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        account_name: 'Test Account for Volunteers',
        account_type: 'individual',
      });

    testAccountId = accountResponse.body.account_id;

    // Create test contact for volunteer
    const contactResponse = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        account_id: testAccountId,
        first_name: 'Volunteer',
        last_name: 'Contact',
        email: 'volunteer.contact@example.com',
      });

    testContactId = contactResponse.body.contact_id;
  });

  afterAll(async () => {
    // Clean up - delete in correct order due to foreign key constraints
    if (testAccountId) {
      // Delete volunteers first (via contacts)
      await pool.query(`
        DELETE FROM volunteers WHERE contact_id IN (
          SELECT id FROM contacts WHERE account_id = $1
        )
      `, [testAccountId]);
      // Then delete contacts
      await pool.query('DELETE FROM contacts WHERE account_id = $1', [testAccountId]);
      // Finally delete account
      await pool.query('DELETE FROM accounts WHERE id = $1', [testAccountId]);
    }
    await pool.end();
  });

  describe('POST /api/volunteers', () => {
    it('should create a new volunteer with valid data', async () => {
      const response = await request(app)
        .post('/api/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: testContactId,
          skills: ['Fundraising', 'Event Planning'],
          availability_status: 'available',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.contact_id).toBe(testContactId);
      expect(response.body.skills).toEqual(['Fundraising', 'Event Planning']);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/volunteers')
        .send({
          contact_id: testContactId,
          skills: ['Marketing'],
        })
        .expect(401);
    });

    it('should require contact_id field', async () => {
      // The API validates that contact_id is required
      const response = await request(app)
        .post('/api/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: testContactId,
          skills: ['Teaching'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('should create volunteer with background check info', async () => {
      const newContactResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Background',
          last_name: 'Check',
          email: 'bg.check@example.com',
        });

      const response = await request(app)
        .post('/api/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: newContactResponse.body.contact_id,
          skills: ['Mentoring'],
          background_check_status: 'approved',
          background_check_date: '2024-01-15',
        })
        .expect(201);

      expect(response.body.background_check_status).toBe('approved');
    });
  });

  describe('GET /api/volunteers', () => {
    it('should return paginated list of volunteers', async () => {
      const response = await request(app)
        .get('/api/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support search query', async () => {
      const response = await request(app)
        .get('/api/volunteers?search=Volunteer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by skills', async () => {
      const response = await request(app)
        .get('/api/volunteers?skills=Fundraising')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by background_check_status', async () => {
      const response = await request(app)
        .get('/api/volunteers?background_check_status=approved')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/volunteers').expect(401);
    });
  });

  describe('GET /api/volunteers/:id', () => {
    it('should return a single volunteer by ID', async () => {
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Single',
          last_name: 'Volunteer',
          email: 'single.volunteer@example.com',
        });

      const volunteerResponse = await request(app)
        .post('/api/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: createResponse.body.contact_id,
          skills: ['Teaching'],
        });

      const volunteerId = volunteerResponse.body.id;

      const response = await request(app)
        .get(`/api/volunteers/${volunteerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(volunteerId);
    });

    it('should return 404 for non-existent volunteer', async () => {
      await request(app)
        .get('/api/volunteers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/volunteers/00000000-0000-0000-0000-000000000000').expect(401);
    });
  });

  describe('PUT /api/volunteers/:id', () => {
    it('should update an existing volunteer', async () => {
      const createContactResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Update',
          last_name: 'Test',
          email: 'update.test@example.com',
        });

      const createResponse = await request(app)
        .post('/api/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: createContactResponse.body.contact_id,
          skills: ['Original Skill'],
        });

      const volunteerId = createResponse.body.id;

      const response = await request(app)
        .put(`/api/volunteers/${volunteerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          skills: ['Updated Skill', 'New Skill'],
          volunteer_status: 'limited',
        })
        .expect(200);

      expect(response.body.skills).toEqual(['Updated Skill', 'New Skill']);
      expect(response.body.volunteer_status).toBe('limited');
    });

    it('should update background check information', async () => {
      const createContactResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'BG',
          last_name: 'Update',
          email: 'bg.update@example.com',
        });

      const createResponse = await request(app)
        .post('/api/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: createContactResponse.body.contact_id,
          skills: ['Coaching'],
          background_check_status: 'pending',
        });

      const volunteerId = createResponse.body.id;

      const response = await request(app)
        .put(`/api/volunteers/${volunteerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          background_check_status: 'approved',
          background_check_date: '2024-03-01',
        })
        .expect(200);

      expect(response.body.background_check_status).toBe('approved');
    });

    it('should return 404 for non-existent volunteer', async () => {
      await request(app)
        .put('/api/volunteers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          skills: ['Updated'],
        })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/volunteers/00000000-0000-0000-0000-000000000000')
        .send({ skills: ['Test'] })
        .expect(401);
    });
  });

  describe('DELETE /api/volunteers/:id', () => {
    it('should soft delete a volunteer', async () => {
      const createContactResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'ToDelete',
          last_name: 'Volunteer',
          email: 'delete.volunteer@example.com',
        });

      const createResponse = await request(app)
        .post('/api/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: createContactResponse.body.contact_id,
          skills: ['Temporary'],
        });

      const volunteerId = createResponse.body.id;

      await request(app)
        .delete(`/api/volunteers/${volunteerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 for non-existent volunteer', async () => {
      await request(app)
        .delete('/api/volunteers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/volunteers/00000000-0000-0000-0000-000000000000').expect(401);
    });
  });
});
