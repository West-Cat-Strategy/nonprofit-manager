import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Contact API Integration Tests', () => {
  let authToken: string;
  let testAccountId: string;

  beforeAll(async () => {
    // Register and login
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `contact-test-${Date.now()}@example.com`,
        password: 'Test123!Strong',
        firstName: 'Contact',
        lastName: 'Tester',
      });

    authToken = registerResponse.body.token;

    // Create a test account for contacts
    const accountResponse = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        account_name: 'Test Account for Contacts',
        account_type: 'organization',
      });

    testAccountId = accountResponse.body.account_id;
  });

  afterAll(async () => {
    // Clean up - delete contacts first due to foreign key constraint
    if (testAccountId) {
      await pool.query('DELETE FROM contacts WHERE account_id = $1', [testAccountId]);
      await pool.query('DELETE FROM accounts WHERE id = $1', [testAccountId]);
    }
    await pool.end();
  });

  describe('POST /api/contacts', () => {
    it('should create a new contact with valid data', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-0200',
        })
        .expect(201);

      expect(response.body).toHaveProperty('contact_id');
      expect(response.body.first_name).toBe('John');
      expect(response.body.last_name).toBe('Doe');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Jane',
          last_name: 'Smith',
        })
        .expect(401);
    });

    it('should create contact with required fields', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Required',
          last_name: 'Fields',
        })
        .expect(201);

      expect(response.body).toHaveProperty('contact_id');
      expect(response.body.first_name).toBe('Required');
    });

    it('should create contact with email', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Email',
          last_name: 'Test',
          email: 'email.test@example.com',
        })
        .expect(201);

      expect(response.body.email).toBe('email.test@example.com');
    });
  });

  describe('GET /api/contacts', () => {
    it('should return paginated list of contacts', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support search query', async () => {
      const response = await request(app)
        .get('/api/contacts?search=John')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by account_id', async () => {
      const response = await request(app)
        .get(`/api/contacts?account_id=${testAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/contacts').expect(401);
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should return a single contact by ID', async () => {
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
        });

      const contactId = createResponse.body.contact_id;

      const response = await request(app)
        .get(`/api/contacts/${contactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.contact_id).toBe(contactId);
      expect(response.body.first_name).toBe('Jane');
    });

    it('should return 404 for non-existent contact', async () => {
      await request(app)
        .get('/api/contacts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/contacts/1').expect(401);
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should update an existing contact', async () => {
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'Original',
          last_name: 'Name',
        });

      const contactId = createResponse.body.contact_id;

      const response = await request(app)
        .put(`/api/contacts/${contactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'Updated',
          email: 'updated@example.com',
        })
        .expect(200);

      expect(response.body.first_name).toBe('Updated');
      expect(response.body.email).toBe('updated@example.com');
    });

    it('should return 404 for non-existent contact', async () => {
      await request(app)
        .put('/api/contacts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'Updated',
        })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).put('/api/contacts/1').send({ first_name: 'Test' }).expect(401);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should soft delete a contact', async () => {
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          first_name: 'ToDelete',
          last_name: 'Contact',
        });

      const contactId = createResponse.body.contact_id;

      // Delete returns 204 No Content
      await request(app)
        .delete(`/api/contacts/${contactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      const response = await request(app)
        .get(`/api/contacts/${contactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.is_active).toBe(false);
    });

    it('should return 404 for non-existent contact', async () => {
      await request(app)
        .delete('/api/contacts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/contacts/1').expect(401);
    });
  });
});
