import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Contact API Integration Tests', () => {
  let authToken: string;
  let testAccountId: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tokenFromResponse = (body: unknown): string | undefined => {
    if (typeof body !== 'object' || body === null) {
      return undefined;
    }
    const value = body as { token?: string; data?: { token?: string } };
    return value.token || value.data?.token;
  };
  const accountIdFromResponse = (body: unknown): string | undefined => {
    if (typeof body !== 'object' || body === null) {
      return undefined;
    }
    const value = body as { account_id?: string; data?: { account_id?: string } };
    return value.account_id || value.data?.account_id;
  };
  const payloadFromResponse = <T>(body: unknown): T => {
    if (typeof body === 'object' && body !== null && 'data' in body) {
      const value = body as { data?: T };
      if (value.data !== undefined) {
        return value.data;
      }
    }
    return body as T;
  };
  const withAuth = (req: ReturnType<typeof request>): ReturnType<typeof request> =>
    req
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', testAccountId);

  beforeAll(async () => {
    // Register and login
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email: `contact-test-${unique()}@example.com`,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Contact',
        last_name: 'Tester',
      });

    authToken = tokenFromResponse(registerResponse.body) || '';
    expect(authToken).toBeTruthy();

    // Create a test account for contacts
    const accountResponse = await request(app)
      .post('/api/v2/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        account_name: 'Test Account for Contacts',
        account_type: 'organization',
      });

    testAccountId = accountIdFromResponse(accountResponse.body) || '';
    expect(testAccountId).toBeTruthy();
  });

  afterAll(async () => {
    // Clean up - delete contacts first due to foreign key constraint
    if (testAccountId) {
      await pool.query('DELETE FROM contacts WHERE account_id = $1', [testAccountId]);
      await pool.query('DELETE FROM accounts WHERE id = $1', [testAccountId]);
    }
  });

  describe('POST /api/v2/contacts', () => {
    it('should create a new contact with valid data', async () => {
      const response = await withAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-123-4567',
        }))
        .expect(201);

      const payload = payloadFromResponse<{ contact_id: string; first_name: string; last_name: string }>(
        response.body
      );
      expect(payload).toHaveProperty('contact_id');
      expect(payload.first_name).toBe('John');
      expect(payload.last_name).toBe('Doe');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Jane',
          last_name: 'Smith',
        })
        .expect(401);
    });

    it('should create contact with required fields', async () => {
      const response = await withAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Required',
          last_name: 'Fields',
        }))
        .expect(201);

      const payload = payloadFromResponse<{ contact_id: string; first_name: string }>(response.body);
      expect(payload).toHaveProperty('contact_id');
      expect(payload.first_name).toBe('Required');
    });

    it('should create contact with email', async () => {
      const response = await withAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Email',
          last_name: 'Test',
          email: 'email.test@example.com',
        }))
        .expect(201);

      const payload = payloadFromResponse<{ email: string }>(response.body);
      expect(payload.email).toBe('email.test@example.com');
    });
  });

  describe('GET /api/v2/contacts', () => {
    it('should return paginated list of contacts', async () => {
      const response = await withAuth(request(app)
        .get('/api/v2/contacts')
      )
        .expect(200);

      const payload = response.body.data?.data ? response.body.data : response.body;
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('pagination');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should support search query', async () => {
      const response = await withAuth(request(app)
        .get('/api/v2/contacts?search=John')
      )
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should filter by account_id', async () => {
      const response = await withAuth(request(app)
        .get(`/api/v2/contacts?account_id=${testAccountId}`)
      )
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/contacts').expect(401);
    });
  });

  describe('GET /api/v2/contacts/:id', () => {
    it('should return a single contact by ID', async () => {
      const createResponse = await withAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
        }));

      const contactId = payloadFromResponse<{ contact_id: string }>(createResponse.body).contact_id;

      const response = await withAuth(request(app)
        .get(`/api/v2/contacts/${contactId}`)
      )
        .expect(200);

      const payload = payloadFromResponse<{ contact_id: string; first_name: string }>(response.body);
      expect(payload.contact_id).toBe(contactId);
      expect(payload.first_name).toBe('Jane');
    });

    it('should return 404 for non-existent contact', async () => {
      await withAuth(request(app)
        .get('/api/v2/contacts/00000000-0000-0000-0000-000000000000')
      )
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/contacts/1').expect(401);
    });
  });

  describe('PUT /api/v2/contacts/:id', () => {
    it('should update an existing contact', async () => {
      const createResponse = await withAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Original',
          last_name: 'Name',
        }));

      const contactId = payloadFromResponse<{ contact_id: string }>(createResponse.body).contact_id;

      const response = await withAuth(request(app)
        .put(`/api/v2/contacts/${contactId}`)
        .send({
          first_name: 'Updated',
          email: 'updated@example.com',
        }))
        .expect(200);

      const payload = payloadFromResponse<{ first_name: string; email: string }>(response.body);
      expect(payload.first_name).toBe('Updated');
      expect(payload.email).toBe('updated@example.com');
    });

    it('should return 404 for non-existent contact', async () => {
      await withAuth(request(app)
        .put('/api/v2/contacts/00000000-0000-0000-0000-000000000000')
        .send({
          first_name: 'Updated',
        }))
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).put('/api/v2/contacts/1').send({ first_name: 'Test' }).expect(401);
    });
  });

  describe('DELETE /api/v2/contacts/:id', () => {
    it('should soft delete a contact', async () => {
      const createResponse = await withAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'ToDelete',
          last_name: 'Contact',
        }));

      const contactId = payloadFromResponse<{ contact_id: string }>(createResponse.body).contact_id;

      // Delete returns 204 No Content
      await withAuth(request(app)
        .delete(`/api/v2/contacts/${contactId}`)
      )
        .expect(204);

      const response = await withAuth(request(app)
        .get(`/api/v2/contacts/${contactId}`)
      )
        .expect(200);

      const payload = payloadFromResponse<{ is_active: boolean }>(response.body);
      expect(payload.is_active).toBe(false);
    });

    it('should return 404 for non-existent contact', async () => {
      await withAuth(request(app)
        .delete('/api/v2/contacts/00000000-0000-0000-0000-000000000000')
      )
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/v2/contacts/1').expect(401);
    });
  });
});
