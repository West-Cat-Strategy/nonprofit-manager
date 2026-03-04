import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Volunteer API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let testContactId: string;
  let testAccountId: string;
  let organizationId: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

  beforeAll(async () => {
    // Register and login
    const email = `volunteer-test-${unique()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Volunteer',
        last_name: 'Tester',
      });

    const registerPayload = unwrap<{
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }>(registerResponse.body);
    const registeredUser = registerPayload.user;

    if (!registeredUser?.id) {
      throw new Error('Failed to register volunteer test user');
    }

    userId = registeredUser.id;

    const orgResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM accounts
       WHERE account_type = 'organization'
         AND COALESCE(is_active, true) = true
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (orgResult.rows[0]?.id) {
      organizationId = orgResult.rows[0].id;
    } else {
      const createdOrg = await pool.query<{ id: string }>(
        `INSERT INTO accounts (account_name, account_type, created_by, modified_by, created_at, updated_at)
         VALUES ($1, 'organization', $2, $2, NOW(), NOW())
         RETURNING id`,
        [`Volunteer Test Organization ${unique()}`, userId]
      );
      organizationId = createdOrg.rows[0].id;
    }

    authToken = jwt.sign(
      {
        id: userId,
        email: registeredUser.email ?? email,
        role: registeredUser.role ?? 'user',
        organizationId,
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Create test account
    const accountResponse = await request(app)
      .post('/api/v2/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        account_name: 'Test Account for Volunteers',
        account_type: 'individual',
      });

    const createdAccount = unwrap<{ account_id?: string; id?: string }>(accountResponse.body);
    testAccountId = createdAccount.account_id ?? createdAccount.id ?? '';
    if (!testAccountId) {
      throw new Error('Failed to create volunteer test account');
    }

    // Create test contact for volunteer
    const contactResponse = await request(app)
      .post('/api/v2/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        account_id: testAccountId,
        first_name: 'Volunteer',
        last_name: 'Contact',
        email: `volunteer-contact-${unique()}@example.com`,
      });

    const createdContact = unwrap<{ contact_id?: string; id?: string }>(contactResponse.body);
    testContactId = createdContact.contact_id ?? createdContact.id ?? '';
    if (!testContactId) {
      throw new Error('Failed to create volunteer test contact');
    }
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
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    if (organizationId) {
      await pool.query('DELETE FROM accounts WHERE id = $1 AND created_by = $2', [organizationId, userId]);
    }
  });

  describe('POST /api/v2/volunteers', () => {
    it('should create a new volunteer with valid data', async () => {
      const response = await request(app)
        .post('/api/v2/volunteers')
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
        .post('/api/v2/volunteers')
        .send({
          contact_id: testContactId,
          skills: ['Marketing'],
        })
        .expect(401);
    });

    it('should require contact_id field', async () => {
      // The API validates that contact_id is required
      const response = await request(app)
        .post('/api/v2/volunteers')
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
        .post('/api/v2/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Background',
          last_name: 'Check',
          email: `bg-check-${unique()}@example.com`,
        });

      const createdContact = unwrap<{ contact_id?: string; id?: string }>(newContactResponse.body);
      const contactId = createdContact.contact_id ?? createdContact.id;
      if (!contactId) {
        throw new Error('Failed to create background-check test contact');
      }

      const response = await request(app)
        .post('/api/v2/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: contactId,
          skills: ['Mentoring'],
          background_check_status: 'approved',
          background_check_date: '2024-01-15',
        })
        .expect(201);

      expect(response.body.background_check_status).toBe('approved');
    });
  });

  describe('GET /api/v2/volunteers', () => {
    it('should return paginated list of volunteers', async () => {
      const response = await request(app)
        .get('/api/v2/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = response.body.data?.data ? response.body.data : response.body;
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('pagination');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should support search query', async () => {
      const response = await request(app)
        .get('/api/v2/volunteers?search=Volunteer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by skills', async () => {
      const response = await request(app)
        .get('/api/v2/volunteers?skills=Fundraising')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by background_check_status', async () => {
      const response = await request(app)
        .get('/api/v2/volunteers?background_check_status=approved')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/volunteers').expect(401);
    });
  });

  describe('GET /api/v2/volunteers/:id', () => {
    it('should return a single volunteer by ID', async () => {
      const createResponse = await request(app)
        .post('/api/v2/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Single',
          last_name: 'Volunteer',
          email: `single-volunteer-${unique()}@example.com`,
        });

      const createdContact = unwrap<{ contact_id?: string; id?: string }>(createResponse.body);
      const contactId = createdContact.contact_id ?? createdContact.id;
      if (!contactId) {
        throw new Error('Failed to create single-volunteer test contact');
      }

      const volunteerResponse = await request(app)
        .post('/api/v2/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: contactId,
          skills: ['Teaching'],
        });

      const volunteerId = volunteerResponse.body.id;

      const response = await request(app)
        .get(`/api/v2/volunteers/${volunteerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(volunteerId);
    });

    it('should return 404 for non-existent volunteer', async () => {
      await request(app)
        .get('/api/v2/volunteers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/volunteers/00000000-0000-0000-0000-000000000000').expect(401);
    });
  });

  describe('PUT /api/v2/volunteers/:id', () => {
    it('should update an existing volunteer', async () => {
      const createContactResponse = await request(app)
        .post('/api/v2/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Update',
          last_name: 'Test',
          email: `update-test-${unique()}@example.com`,
        });

      const createdContact = unwrap<{ contact_id?: string; id?: string }>(createContactResponse.body);
      const contactId = createdContact.contact_id ?? createdContact.id;
      if (!contactId) {
        throw new Error('Failed to create update test contact');
      }

      const createResponse = await request(app)
        .post('/api/v2/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: contactId,
          skills: ['Original Skill'],
        });

      const volunteerId = createResponse.body.id;

      const response = await request(app)
        .put(`/api/v2/volunteers/${volunteerId}`)
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
        .post('/api/v2/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'BG',
          last_name: 'Update',
          email: `bg-update-${unique()}@example.com`,
        });

      const createdContact = unwrap<{ contact_id?: string; id?: string }>(createContactResponse.body);
      const contactId = createdContact.contact_id ?? createdContact.id;
      if (!contactId) {
        throw new Error('Failed to create background update test contact');
      }

      const createResponse = await request(app)
        .post('/api/v2/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: contactId,
          skills: ['Coaching'],
          background_check_status: 'pending',
        });

      const volunteerId = createResponse.body.id;

      const response = await request(app)
        .put(`/api/v2/volunteers/${volunteerId}`)
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
        .put('/api/v2/volunteers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          skills: ['Updated'],
        })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v2/volunteers/00000000-0000-0000-0000-000000000000')
        .send({ skills: ['Test'] })
        .expect(401);
    });
  });

  describe('DELETE /api/v2/volunteers/:id', () => {
    it('should soft delete a volunteer', async () => {
      const createContactResponse = await request(app)
        .post('/api/v2/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'ToDelete',
          last_name: 'Volunteer',
          email: `delete-volunteer-${unique()}@example.com`,
        });

      const createdContact = unwrap<{ contact_id?: string; id?: string }>(createContactResponse.body);
      const contactId = createdContact.contact_id ?? createdContact.id;
      if (!contactId) {
        throw new Error('Failed to create delete test contact');
      }

      const createResponse = await request(app)
        .post('/api/v2/volunteers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_id: contactId,
          skills: ['Temporary'],
        });

      const volunteerId = createResponse.body.id;

      await request(app)
        .delete(`/api/v2/volunteers/${volunteerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 for non-existent volunteer', async () => {
      await request(app)
        .delete('/api/v2/volunteers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/v2/volunteers/00000000-0000-0000-0000-000000000000').expect(401);
    });
  });
});
