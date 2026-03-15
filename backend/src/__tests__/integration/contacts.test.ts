import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Contact API Integration Tests', () => {
  let authToken: string;
  let staffAuthToken: string;
  let testAccountId: string;
  let creatorUserId: string;
  let staffUserId: string;
  const sharedPassword = 'Test123!Strong';
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
  const withAuthToken = (token: string, req: ReturnType<typeof request>): ReturnType<typeof request> =>
    req
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', testAccountId);
  const withAuth = (req: ReturnType<typeof request>): ReturnType<typeof request> =>
    withAuthToken(authToken, req);
  const withStaffAuth = (req: ReturnType<typeof request>): ReturnType<typeof request> =>
    withAuthToken(staffAuthToken, req);

  beforeAll(async () => {
    // Register and login
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email: `contact-test-${unique()}@example.com`,
        password: sharedPassword,
        password_confirm: sharedPassword,
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

    const accountOwnerResult = await pool.query<{ created_by: string }>(
      'SELECT created_by FROM accounts WHERE id = $1',
      [testAccountId]
    );
    creatorUserId = accountOwnerResult.rows[0]?.created_by || '';
    expect(creatorUserId).toBeTruthy();

    const staffEmail = `contact-staff-${unique()}@example.com`;
    await request(app)
      .post('/api/v2/auth/register')
      .send({
        email: staffEmail,
        password: sharedPassword,
        password_confirm: sharedPassword,
        first_name: 'Staff',
        last_name: 'Tester',
      })
      .expect(201);

    const staffRoleResult = await pool.query<{ id: string }>(
      'UPDATE users SET role = $1 WHERE email = $2 RETURNING id',
      ['staff', staffEmail.toLowerCase()]
    );
    staffUserId = staffRoleResult.rows[0]?.id || '';
    expect(staffUserId).toBeTruthy();

    const staffLoginResponse = await request(app)
      .post('/api/v2/auth/login')
      .send({ email: staffEmail, password: sharedPassword })
      .expect(200);
    staffAuthToken = tokenFromResponse(staffLoginResponse.body) || '';
    expect(staffAuthToken).toBeTruthy();

    await pool.query(
      `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
       VALUES
         ($1, $3, 'admin', $1, TRUE),
         ($2, $3, 'staff', $1, TRUE)
       ON CONFLICT (user_id, account_id)
       DO UPDATE SET access_level = EXCLUDED.access_level, granted_by = EXCLUDED.granted_by, is_active = TRUE`,
      [creatorUserId, staffUserId, testAccountId]
    );
  });

  afterAll(async () => {
    // Clean up - delete contacts first due to foreign key constraint
    if (testAccountId) {
      await pool.query('DELETE FROM contacts WHERE account_id = $1', [testAccountId]);
      await pool.query('DELETE FROM user_account_access WHERE account_id = $1', [testAccountId]);
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

    it('should accept formatted PHN input and normalize to 10 digits', async () => {
      const response = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Phn',
          last_name: 'Normalized',
          phn: '123-456-7890',
        }))
        .expect(201);

      const payload = payloadFromResponse<{ phn: string | null }>(response.body);
      expect(payload.phn).toBe('1234567890');
    });

    it('should persist date-only DOB, multiple roles, and seeded child contact methods', async () => {
      const suffix = unique();
      const email = `contact-profile-${suffix}@example.com`;
      const phone = '555-111-2222';
      const mobilePhone = '555-333-4444';

      const createResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Profile',
          last_name: 'Consistency',
          birth_date: '1986-07-09',
          email,
          phone,
          mobile_phone: mobilePhone,
          roles: ['Staff', 'Board Member'],
        }))
        .expect(201);

      const createdPayload = payloadFromResponse<{
        contact_id: string;
        birth_date: string | null;
        email: string | null;
        phone: string | null;
        mobile_phone: string | null;
        roles: string[];
      }>(createResponse.body);
      expect(createdPayload.birth_date).toBe('1986-07-09');
      expect(createdPayload.email).toBe(email);
      expect(createdPayload.phone).toBe(phone);
      expect(createdPayload.mobile_phone).toBe(mobilePhone);
      expect(createdPayload.roles).toEqual(expect.arrayContaining(['Staff', 'Board Member']));

      const detailResponse = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${createdPayload.contact_id}`))
        .expect(200);
      const detailPayload = payloadFromResponse<{
        birth_date: string | null;
        roles: string[];
      }>(detailResponse.body);
      expect(detailPayload.birth_date).toBe('1986-07-09');
      expect(detailPayload.roles).toEqual(expect.arrayContaining(['Staff', 'Board Member']));

      const emailsResponse = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${createdPayload.contact_id}/emails`))
        .expect(200);
      const emailsPayload = payloadFromResponse<Array<{
        email_address: string;
        label: string;
        is_primary: boolean;
      }>>(emailsResponse.body);
      expect(emailsPayload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email_address: email,
            label: 'personal',
            is_primary: true,
          }),
        ])
      );

      const phonesResponse = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${createdPayload.contact_id}/phones`))
        .expect(200);
      const phonesPayload = payloadFromResponse<Array<{
        phone_number: string;
        label: string;
      }>>(phonesResponse.body);
      expect(phonesPayload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            phone_number: phone,
            label: 'other',
          }),
          expect.objectContaining({
            phone_number: mobilePhone,
            label: 'mobile',
          }),
        ])
      );
    });

    it('should reject invalid PHN length', async () => {
      await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Bad',
          last_name: 'Phn',
          phn: '12345',
        }))
        .expect(400);
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
      const response = await withStaffAuth(request(app)
        .get('/api/v2/contacts?search=John')
      )
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should match full-name searches when optional fields are empty', async () => {
      const uniqueSuffix = unique();
      const firstName = `Full-${uniqueSuffix}`;
      const lastName = `Search-${uniqueSuffix}`;

      const createResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: firstName,
          last_name: lastName,
          email: `full-search-${uniqueSuffix}@example.com`,
        }))
        .expect(201);

      const createdPayload = payloadFromResponse<{ contact_id: string }>(createResponse.body);
      const response = await withStaffAuth(request(app)
        .get(`/api/v2/contacts?search=${encodeURIComponent(`${firstName} ${lastName}`)}`)
      )
        .expect(200);

      const payload = payloadFromResponse<{
        data: Array<{ contact_id: string; first_name: string; last_name: string }>;
      }>(response.body);

      expect(payload.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            contact_id: createdPayload.contact_id,
            first_name: firstName,
            last_name: lastName,
          }),
        ])
      );
    });

    it('should filter by account_id', async () => {
      const response = await withStaffAuth(request(app)
        .get(`/api/v2/contacts?account_id=${testAccountId}`)
      )
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should filter by client role', async () => {
      const uniqueSuffix = unique();
      const createResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Role',
          last_name: `Client-${uniqueSuffix}`,
          email: `role-client-${uniqueSuffix}@example.com`,
          roles: ['Client'],
        }))
        .expect(201);

      const createdPayload = payloadFromResponse<{ contact_id: string }>(createResponse.body);
      const response = await withStaffAuth(request(app)
        .get(`/api/v2/contacts?role=client&search=Client-${uniqueSuffix}`)
      )
        .expect(200);

      const payload = payloadFromResponse<{
        data: Array<{ contact_id: string; last_name: string }>;
      }>(response.body);
      expect(payload.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            contact_id: createdPayload.contact_id,
          }),
        ])
      );
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/contacts').expect(401);
    });

    it('should reject invalid role filter values', async () => {
      await withStaffAuth(request(app)
        .get('/api/v2/contacts?role=not-a-role')
      )
        .expect(400);
    });
  });

  describe('GET /api/v2/contacts/lookup', () => {
    it('should return lightweight lookup results', async () => {
      await withAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Lookup',
          last_name: 'Person',
          email: 'lookup.person@example.com',
        }))
        .expect(201);

      const response = await withStaffAuth(request(app)
        .get('/api/v2/contacts/lookup?q=lookup&limit=5')
      )
        .expect(200);

      const payload = payloadFromResponse<{ items: Array<Record<string, unknown>> }>(response.body);
      expect(Array.isArray(payload.items)).toBe(true);
      expect(payload.items.length).toBeGreaterThan(0);
      const item = payload.items[0];
      expect(item).toEqual(
        expect.objectContaining({
          contact_id: expect.any(String),
          first_name: expect.any(String),
          last_name: expect.any(String),
          is_active: expect.any(Boolean),
        })
      );
      expect(item).toHaveProperty('email');
      expect(item).toHaveProperty('phone');
      expect(item).toHaveProperty('mobile_phone');
      expect(item.email === null || typeof item.email === 'string').toBe(true);
      expect(item.phone === null || typeof item.phone === 'string').toBe(true);
      expect(item.mobile_phone === null || typeof item.mobile_phone === 'string').toBe(true);
      expect(item).not.toHaveProperty('note_count');
      expect(item).not.toHaveProperty('relationship_count');
    });

    it('should match full-name lookup queries when preferred name is empty', async () => {
      const uniqueSuffix = unique();
      const firstName = `Lookup-${uniqueSuffix}`;
      const lastName = `Person-${uniqueSuffix}`;

      const createResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: firstName,
          last_name: lastName,
          email: `lookup-person-${uniqueSuffix}@example.com`,
        }))
        .expect(201);

      const createdPayload = payloadFromResponse<{ contact_id: string }>(createResponse.body);
      const response = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/lookup?q=${encodeURIComponent(`${firstName} ${lastName}`)}&limit=5`)
      )
        .expect(200);

      const payload = payloadFromResponse<{ items: Array<{ contact_id: string; first_name: string; last_name: string }> }>(response.body);
      expect(payload.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            contact_id: createdPayload.contact_id,
            first_name: firstName,
            last_name: lastName,
          }),
        ])
      );
    });

    it('should enforce query validation', async () => {
      await withStaffAuth(request(app)
        .get('/api/v2/contacts/lookup?q=a')
      )
        .expect(400);
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

      const response = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${contactId}`)
      )
        .expect(200);

      const payload = payloadFromResponse<{ contact_id: string; first_name: string }>(response.body);
      expect(payload.contact_id).toBe(contactId);
      expect(payload.first_name).toBe('Jane');
    });

    it('should return 404 for non-existent contact', async () => {
      await withStaffAuth(request(app)
        .get('/api/v2/contacts/00000000-0000-0000-0000-000000000000')
      )
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/contacts/1').expect(401);
    });

    it('should return full PHN for staff and masked PHN for non-staff', async () => {
      const createResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Visibility',
          last_name: 'Phn',
          phn: '0987654321',
        }))
        .expect(201);

      const contactId = payloadFromResponse<{ contact_id: string }>(createResponse.body).contact_id;

      const staffViewResponse = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${contactId}`))
        .expect(200);
      const staffPayload = payloadFromResponse<{ phn: string | null }>(staffViewResponse.body);
      expect(staffPayload.phn).toBe('0987654321');

      const nonStaffViewResponse = await withAuth(request(app)
        .get(`/api/v2/contacts/${contactId}`))
        .expect(200);
      const nonStaffPayload = payloadFromResponse<{ phn: string | null }>(nonStaffViewResponse.body);
      expect(nonStaffPayload.phn).toBe('******4321');
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

      const response = await withStaffAuth(request(app)
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

    it('should clear summary contact methods and preserve DOB as a date-only string', async () => {
      const suffix = unique();
      const createResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Clear',
          last_name: 'Summary',
          birth_date: '1990-04-12',
          email: `clear-summary-${suffix}@example.com`,
          phone: '555-444-1111',
          mobile_phone: '555-444-2222',
        }))
        .expect(201);

      const contactId = payloadFromResponse<{ contact_id: string }>(createResponse.body).contact_id;

      const updateResponse = await withStaffAuth(request(app)
        .put(`/api/v2/contacts/${contactId}`)
        .send({
          birth_date: '1990-04-12',
          email: null,
          phone: null,
          mobile_phone: null,
        }))
        .expect(200);

      const updatedPayload = payloadFromResponse<{
        birth_date: string | null;
        email: string | null;
        phone: string | null;
        mobile_phone: string | null;
      }>(updateResponse.body);
      expect(updatedPayload.birth_date).toBe('1990-04-12');
      expect(updatedPayload.email).toBeNull();
      expect(updatedPayload.phone).toBeNull();
      expect(updatedPayload.mobile_phone).toBeNull();

      const emailsResponse = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${contactId}/emails`))
        .expect(200);
      const emailsPayload = payloadFromResponse<Array<unknown>>(emailsResponse.body);
      expect(emailsPayload).toEqual([]);

      const phonesResponse = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${contactId}/phones`))
        .expect(200);
      const phonesPayload = payloadFromResponse<Array<unknown>>(phonesResponse.body);
      expect(phonesPayload).toEqual([]);
    });

    it('should return 404 for non-existent contact', async () => {
      await withStaffAuth(request(app)
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

  describe('contact child method sync', () => {
    it('should refresh parent summaries when email and phone child records change', async () => {
      const suffix = unique();
      const createResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Child',
          last_name: 'Sync',
        }))
        .expect(201);

      const contactId = payloadFromResponse<{ contact_id: string }>(createResponse.body).contact_id;

      const emailCreateResponse = await withStaffAuth(request(app)
        .post(`/api/v2/contacts/${contactId}/emails`)
        .send({
          email_address: `child-sync-${suffix}@example.com`,
          label: 'work',
          is_primary: true,
        }))
        .expect(201);
      const createdEmail = emailCreateResponse.body as { id: string; email_address: string };

      const phoneCreateResponse = await withStaffAuth(request(app)
        .post(`/api/v2/contacts/${contactId}/phones`)
        .send({
          phone_number: '555-777-1000',
          label: 'other',
          is_primary: true,
        }))
        .expect(201);
      const createdPhone = phoneCreateResponse.body as { id: string; phone_number: string };

      const mobileCreateResponse = await withStaffAuth(request(app)
        .post(`/api/v2/contacts/${contactId}/phones`)
        .send({
          phone_number: '555-777-2000',
          label: 'mobile',
        }))
        .expect(201);
      const createdMobile = mobileCreateResponse.body as { id: string; phone_number: string };

      const updatedEmailAddress = `child-sync-updated-${suffix}@example.com`;
      await withStaffAuth(request(app)
        .put(`/api/v2/contacts/emails/${createdEmail.id}`)
        .send({
          email_address: updatedEmailAddress,
          label: 'personal',
          is_primary: true,
        }))
        .expect(200);

      await withStaffAuth(request(app)
        .put(`/api/v2/contacts/phones/${createdPhone.id}`)
        .send({
          phone_number: '555-777-3000',
          label: 'other',
          is_primary: true,
        }))
        .expect(200);

      await withStaffAuth(request(app)
        .delete(`/api/v2/contacts/phones/${createdMobile.id}`))
        .expect(204);

      const detailResponse = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${contactId}`))
        .expect(200);
      const detailPayload = payloadFromResponse<{
        email: string | null;
        phone: string | null;
        mobile_phone: string | null;
      }>(detailResponse.body);
      expect(detailPayload.email).toBe(updatedEmailAddress);
      expect(detailPayload.phone).toBe('555-777-3000');
      expect(detailPayload.mobile_phone).toBeNull();
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
      await withStaffAuth(request(app)
        .delete(`/api/v2/contacts/${contactId}`)
      )
        .expect(204);

      const response = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${contactId}`)
      )
        .expect(200);

      const payload = payloadFromResponse<{ is_active: boolean }>(response.body);
      expect(payload.is_active).toBe(false);
    });

    it('should return 404 for non-existent contact', async () => {
      await withStaffAuth(request(app)
        .delete('/api/v2/contacts/00000000-0000-0000-0000-000000000000')
      )
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/v2/contacts/1').expect(401);
    });
  });
});
