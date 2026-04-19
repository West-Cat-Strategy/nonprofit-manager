import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';
import { ContactService } from '../../services/contactService';

describe('Contact API Integration Tests', () => {
  let authToken: string;
  let staffAuthToken: string;
  let viewerAuthToken: string;
  let adminAuthToken: string;
  let testAccountId: string;
  let creatorUserId: string;
  let staffUserId: string;
  const contactService = new ContactService(pool);
  const createdEventIds: string[] = [];
  const createdAppointmentIds: string[] = [];
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
  const withViewerAuth = (req: ReturnType<typeof request>): ReturnType<typeof request> =>
    withAuthToken(viewerAuthToken, req);
  const withAdminAuth = (req: ReturnType<typeof request>): ReturnType<typeof request> =>
    withAuthToken(adminAuthToken, req);

  beforeAll(async () => {
    // Register and login
    const email = `contact-test-${unique()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email,
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

    viewerAuthToken = jwt.sign(
      {
        id: creatorUserId,
        email,
        role: 'viewer',
        organizationId: testAccountId,
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
    adminAuthToken = jwt.sign(
      {
        id: creatorUserId,
        email,
        role: 'admin',
        organizationId: testAccountId,
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

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
    // Clean up account-scoped records before removing the account and contacts
    if (createdAppointmentIds.length > 0) {
      await pool.query('DELETE FROM appointments WHERE id = ANY($1::uuid[])', [createdAppointmentIds]);
    }
    if (testAccountId) {
      await pool.query(
        `DELETE FROM activity_events
         WHERE related_entity_type = 'contact'
           AND related_entity_id IN (SELECT id FROM contacts WHERE account_id = $1)`,
        [testAccountId]
      );
      await pool.query('DELETE FROM contact_notes WHERE contact_id IN (SELECT id FROM contacts WHERE account_id = $1)', [testAccountId]);
      await pool.query('DELETE FROM case_notes WHERE case_id IN (SELECT id FROM cases WHERE account_id = $1)', [
        testAccountId,
      ]);
      await pool.query('DELETE FROM cases WHERE account_id = $1', [testAccountId]);
    }
    if (createdEventIds.length > 0) {
      await pool.query('DELETE FROM events WHERE id = ANY($1::uuid[])', [createdEventIds]);
    }
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
      expect(payload.email).toMatch(/^e\*+@example\.com$/);
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
      expect(createdPayload.birth_date).toBe('1986-**-**');
      expect(createdPayload.email).toMatch(/^c\*+@example\.com$/);
      expect(createdPayload.phone).toBe('***-***-2222');
      expect(createdPayload.mobile_phone).toBe('***-***-4444');
      expect(createdPayload.roles).toEqual(expect.arrayContaining(['Staff', 'Board Member']));

      const detailResponse = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${createdPayload.contact_id}`))
        .expect(200);
      const detailPayload = payloadFromResponse<{
        birth_date: string | null;
        roles: string[];
      }>(detailResponse.body);
      expect(detailPayload.birth_date).toBe('1986-**-**');
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

      const nonStaffViewResponse = await withViewerAuth(request(app)
        .get(`/api/v2/contacts/${contactId}`))
        .expect(200);
      const nonStaffPayload = payloadFromResponse<{ phn: string | null }>(nonStaffViewResponse.body);
      expect(nonStaffPayload.phn).toBe('******4321');
    });
  });

  describe('GET /api/v2/contacts/:id/communications', () => {
    it('returns aggregated appointment and event reminder history for the contact', async () => {
      const suffix = unique();
      const contactCreateResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Communications',
          last_name: 'History',
          email: `communications-${suffix}@example.com`,
          phone: '555-020-1234',
        }))
        .expect(201);

      const contactId = payloadFromResponse<{ contact_id: string }>(contactCreateResponse.body).contact_id;

      const appointmentResult = await pool.query<{ id: string }>(
        `INSERT INTO appointments (
           contact_id,
           title,
           start_time,
           status,
           created_by
         ) VALUES ($1, $2, NOW() + interval '2 days', 'confirmed', $3)
         RETURNING id`,
        [contactId, 'Reminder-ready appointment', staffUserId]
      );
      const appointmentId = appointmentResult.rows[0].id;
      createdAppointmentIds.push(appointmentId);

      const eventResult = await pool.query<{ id: string }>(
        `INSERT INTO events (
           name,
           event_type,
           start_date,
           end_date,
           location_name,
           created_by,
           modified_by
         ) VALUES ($1, 'community', NOW() + interval '4 days', NOW() + interval '4 days 2 hours', 'Town Hall', $2, $2)
         RETURNING id`,
        [`Reminder Event ${suffix}`, staffUserId]
      );
      const eventId = eventResult.rows[0].id;
      createdEventIds.push(eventId);

      const registrationResult = await pool.query<{ id: string }>(
        `INSERT INTO event_registrations (event_id, contact_id, registration_status)
         VALUES ($1, $2, 'registered')
         RETURNING id`,
        [eventId, contactId]
      );
      const registrationId = registrationResult.rows[0].id;

      await pool.query(
        `INSERT INTO appointment_reminder_deliveries (
           appointment_id,
           channel,
           trigger_type,
           recipient,
           delivery_status,
           message_preview,
           sent_by,
           sent_at
         ) VALUES ($1, 'email', 'manual', $2, 'sent', 'Appointment reminder preview', $3, NOW() - interval '1 hour')`,
        [appointmentId, `communications-${suffix}@example.com`, staffUserId]
      );

      await pool.query(
        `INSERT INTO event_reminder_deliveries (
           event_id,
           registration_id,
           channel,
           recipient,
           delivery_status,
           error_message,
           message_preview,
           sent_by,
           trigger_type,
           sent_at
         ) VALUES ($1, $2, 'sms', $3, 'failed', 'Carrier rejected message', 'Event reminder preview', $4, 'automated', NOW() - interval '2 hours')`,
        [eventId, registrationId, '+15550201234', staffUserId]
      );

      const response = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${contactId}/communications`)
      )
        .expect(200);

      const payload = payloadFromResponse<{
        items: Array<{
          source_type: string;
          channel: string;
          delivery_status: string;
          source_label: string;
          action: { type: string; appointment_id?: string; event_id?: string };
        }>;
        total: number;
      }>(response.body);

      expect(payload.total).toBe(2);
      expect(payload.items).toHaveLength(2);
      expect(payload.items[0]).toEqual(
        expect.objectContaining({
          source_type: 'appointment_reminder',
          channel: 'email',
          delivery_status: 'sent',
          action: expect.objectContaining({
            type: 'send_appointment_reminder',
            appointment_id: appointmentId,
          }),
        })
      );
      expect(payload.items[1]).toEqual(
        expect.objectContaining({
          source_type: 'event_reminder',
          channel: 'sms',
          delivery_status: 'failed',
          source_label: `Reminder Event ${suffix}`,
          action: expect.objectContaining({
            type: 'open_event',
            event_id: eventId,
          }),
        })
      );
    });

    it('supports filtering by channel', async () => {
      const contactResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Communications',
          last_name: 'Filter',
        }))
        .expect(201);
      const contactId = payloadFromResponse<{ contact_id: string }>(contactResponse.body).contact_id;

      const appointmentResult = await pool.query<{ id: string }>(
        `INSERT INTO appointments (
           contact_id,
           title,
           start_time,
           status,
           created_by
         ) VALUES ($1, 'SMS reminder appointment', NOW() + interval '3 days', 'confirmed', $2)
         RETURNING id`,
        [contactId, staffUserId]
      );
      const appointmentId = appointmentResult.rows[0].id;
      createdAppointmentIds.push(appointmentId);

      await pool.query(
        `INSERT INTO appointment_reminder_deliveries (
           appointment_id,
           channel,
           trigger_type,
           recipient,
           delivery_status,
           message_preview,
           sent_by
         ) VALUES ($1, 'sms', 'manual', '+15550209999', 'sent', 'SMS appointment reminder', $2)`,
        [appointmentId, staffUserId]
      );

      const response = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${contactId}/communications`)
        .query({ channel: 'sms' })
      )
        .expect(200);

      const payload = payloadFromResponse<{
        items: Array<{ channel: string }>;
        total: number;
        filters: { channel?: string };
      }>(response.body);

      expect(payload.total).toBe(1);
      expect(payload.items).toEqual([expect.objectContaining({ channel: 'sms' })]);
      expect(payload.filters.channel).toBe('sms');
    });
  });

  describe('GET /api/v2/contacts/:id/notes/timeline', () => {
    it('returns mixed contact notes, case notes, and event activity in reverse chronological order', async () => {
      const suffix = unique();
      const contactCreateResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Timeline',
          last_name: 'Tester',
          email: `timeline-${suffix}@example.com`,
        }))
        .expect(201);

      const contactId = payloadFromResponse<{ contact_id: string }>(contactCreateResponse.body).contact_id;

      const caseTypeResult = await pool.query<{ id: string }>(
        `SELECT id
         FROM case_types
         WHERE is_active = true
         ORDER BY name ASC, created_at ASC
         LIMIT 1`
      );
      const caseStatusResult = await pool.query<{ id: string }>(
        `SELECT id
         FROM case_statuses
         WHERE is_active = true
         ORDER BY sort_order ASC NULLS LAST, created_at ASC
         LIMIT 1`
      );

      const caseId = (
        await pool.query<{ id: string }>(
          `INSERT INTO cases (
             case_number,
             contact_id,
             account_id,
             case_type_id,
             status_id,
             title,
             assigned_to,
             created_by,
             modified_by,
             created_at,
             updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7, NOW(), NOW())
           RETURNING id`,
          [
            `CASE-TL-${suffix}`,
            contactId,
            testAccountId,
            caseTypeResult.rows[0].id,
            caseStatusResult.rows[0].id,
            'Timeline Case',
            staffUserId,
          ]
        )
      ).rows[0].id;

      const contactNoteId = (
        await pool.query<{ id: string }>(
          `INSERT INTO contact_notes (
             contact_id,
             case_id,
             note_type,
             subject,
             content,
             is_internal,
             is_important,
             is_pinned,
             is_alert,
             is_portal_visible,
             attachments,
             created_by,
             created_at,
             updated_at
           ) VALUES (
             $1,
             $2,
             'note',
             'Contact timeline note',
             'Contact note content',
             false,
             false,
             true,
             false,
             false,
             NULL,
             $3,
             $4,
             $4
           )
           RETURNING id`,
          [contactId, caseId, staffUserId, '2026-04-10T10:00:00.000Z']
        )
      ).rows[0].id;

      const caseNoteId = (
        await pool.query<{ id: string }>(
          `INSERT INTO case_notes (
             case_id,
             note_type,
             subject,
             content,
             is_internal,
             visible_to_client,
             is_important,
             created_by,
             updated_by,
             created_at,
             updated_at
           ) VALUES (
             $1,
             'note',
             'Case timeline note',
             'Case note content',
             true,
             false,
             true,
             $2,
             $2,
             $3,
             $3
           )
           RETURNING id`,
          [caseId, staffUserId, '2026-04-11T10:00:00.000Z']
        )
      ).rows[0].id;

      const eventId = (
        await pool.query<{ id: string }>(
          `INSERT INTO events (
             name,
             event_type,
             start_date,
             end_date,
             location_name,
             created_by,
             modified_by
           ) VALUES (
             $1,
             'community',
             NOW() + interval '5 days',
             NOW() + interval '5 days 2 hours',
             'Community Hall',
             $2,
             $2
           )
           RETURNING id`,
          [`Timeline Event ${suffix}`, staffUserId]
        )
      ).rows[0].id;
      createdEventIds.push(eventId);

      await pool.query(
        `INSERT INTO activity_events (
           organization_id,
           site_id,
           activity_type,
           title,
           description,
           actor_user_id,
           actor_name,
           entity_type,
           entity_id,
           related_entity_type,
           related_entity_id,
           metadata,
           occurred_at
         ) VALUES (
           $1,
           NULL,
           'event_registration_updated',
           'Timeline Event RSVP',
           'Registration status changed from registered to confirmed',
           $2,
           NULL,
           'event',
           $3,
           'contact',
           $4,
           $5::jsonb,
           $6
         )`,
        [
          testAccountId,
          staffUserId,
          eventId,
          contactId,
          JSON.stringify({
            eventId,
            eventName: `Timeline Event ${suffix}`,
            caseId,
            caseNumber: `CASE-TL-${suffix}`,
            caseTitle: 'Timeline Case',
            registrationStatus: 'confirmed',
            previousStatus: 'registered',
            nextStatus: 'confirmed',
          }),
          '2026-04-12T10:00:00.000Z',
        ]
      );

      const response = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/${contactId}/notes/timeline`))
        .expect(200);

      const payload = payloadFromResponse<{
        items: Array<{
          id: string;
          source_type: string;
          event_id: string | null;
          event_name: string | null;
          case_id: string | null;
          case_number: string | null;
          previous_registration_status: string | null;
          next_registration_status: string | null;
        }>;
        counts: {
          all: number;
          contact_notes: number;
          case_notes: number;
          event_activity: number;
        };
      }>(response.body);

      expect(payload.counts).toEqual({
        all: 3,
        contact_notes: 1,
        case_notes: 1,
        event_activity: 1,
      });
      expect(payload.items.map((item) => item.source_type)).toEqual([
        'event_activity',
        'case_note',
        'contact_note',
      ]);
      expect(payload.items[0]).toEqual(
        expect.objectContaining({
          event_id: eventId,
          event_name: `Timeline Event ${suffix}`,
          case_id: caseId,
          case_number: `CASE-TL-${suffix}`,
          previous_registration_status: 'registered',
          next_registration_status: 'confirmed',
        })
      );
      expect(payload.items[1].id).toBe(caseNoteId);
      expect(payload.items[2].id).toBe(contactNoteId);
    });

    it('excludes case notes whose case does not resolve to the active organization', async () => {
      const suffix = unique();
      const contactCreateResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: 'Scoped',
          last_name: 'Timeline',
          email: `timeline-scope-${suffix}@example.com`,
        }))
        .expect(201);

      const contactId = payloadFromResponse<{ contact_id: string }>(contactCreateResponse.body).contact_id;

      const secondaryAccountResponse = await request(app)
        .post('/api/v2/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_name: `Timeline Scope ${suffix}`,
          account_type: 'organization',
        })
        .expect(201);

      const secondaryAccountId = accountIdFromResponse(secondaryAccountResponse.body);
      expect(secondaryAccountId).toBeTruthy();

      if (!secondaryAccountId) {
        throw new Error('Failed to create secondary account');
      }

      const caseTypeResult = await pool.query<{ id: string }>(
        `SELECT id
         FROM case_types
         WHERE is_active = true
         ORDER BY name ASC, created_at ASC
         LIMIT 1`
      );
      const caseStatusResult = await pool.query<{ id: string }>(
        `SELECT id
         FROM case_statuses
         WHERE is_active = true
         ORDER BY sort_order ASC NULLS LAST, created_at ASC
         LIMIT 1`
      );

      const createdCaseIds: string[] = [];
      const createdCaseNoteIds: string[] = [];

      try {
        const activeCaseId = (
          await pool.query<{ id: string }>(
            `INSERT INTO cases (
               case_number,
               contact_id,
               account_id,
               case_type_id,
               status_id,
               title,
               assigned_to,
               created_by,
               modified_by,
               created_at,
               updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7, NOW(), NOW())
             RETURNING id`,
            [
              `CASE-SCOPE-${suffix}-A`,
              contactId,
              testAccountId,
              caseTypeResult.rows[0].id,
              caseStatusResult.rows[0].id,
              'Timeline Scoped Case',
              staffUserId,
            ]
          )
        ).rows[0].id;
        createdCaseIds.push(activeCaseId);

        const externalCaseId = (
          await pool.query<{ id: string }>(
            `INSERT INTO cases (
               case_number,
               contact_id,
               account_id,
               case_type_id,
               status_id,
               title,
               assigned_to,
               created_by,
               modified_by,
               created_at,
               updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7, NOW(), NOW())
             RETURNING id`,
            [
              `CASE-SCOPE-${suffix}-B`,
              contactId,
              secondaryAccountId,
              caseTypeResult.rows[0].id,
              caseStatusResult.rows[0].id,
              'Timeline External Case',
              staffUserId,
            ]
          )
        ).rows[0].id;
        createdCaseIds.push(externalCaseId);

        const activeCaseNoteId = (
          await pool.query<{ id: string }>(
            `INSERT INTO case_notes (
               case_id,
               note_type,
               subject,
               content,
               is_internal,
               visible_to_client,
               is_important,
               created_by,
               updated_by,
               created_at,
               updated_at
             ) VALUES (
               $1,
               'note',
               'Active org case note',
               'This note should be visible in the active organization timeline',
               false,
               true,
               false,
               $2,
               $2,
               $3,
               $3
             )
             RETURNING id`,
            [activeCaseId, staffUserId, '2026-04-13T10:00:00.000Z']
          )
        ).rows[0].id;
        createdCaseNoteIds.push(activeCaseNoteId);

        const externalCaseNoteId = (
          await pool.query<{ id: string }>(
            `INSERT INTO case_notes (
               case_id,
               note_type,
               subject,
               content,
               is_internal,
               visible_to_client,
               is_important,
               created_by,
               updated_by,
               created_at,
               updated_at
             ) VALUES (
               $1,
               'note',
               'External org case note',
               'This note should be hidden from the active organization timeline',
               false,
               true,
               false,
               $2,
               $2,
               $3,
               $3
             )
             RETURNING id`,
            [externalCaseId, staffUserId, '2026-04-14T10:00:00.000Z']
          )
        ).rows[0].id;
        createdCaseNoteIds.push(externalCaseNoteId);

        const response = await withStaffAuth(request(app)
          .get(`/api/v2/contacts/${contactId}/notes/timeline`))
          .expect(200);

        const payload = payloadFromResponse<{
          items: Array<{
            id: string;
            source_type: string;
            case_id: string | null;
            case_number: string | null;
          }>;
          counts: {
            all: number;
            contact_notes: number;
            case_notes: number;
            event_activity: number;
          };
        }>(response.body);

        expect(payload.counts).toEqual({
          all: 1,
          contact_notes: 0,
          case_notes: 1,
          event_activity: 0,
        });

        const caseNoteItems = payload.items.filter((item) => item.source_type === 'case_note');
        expect(caseNoteItems).toEqual([
          expect.objectContaining({
            id: activeCaseNoteId,
            case_id: activeCaseId,
            case_number: `CASE-SCOPE-${suffix}-A`,
          }),
        ]);
        expect(caseNoteItems.map((item) => item.id)).not.toContain(externalCaseNoteId);
      } finally {
        if (createdCaseNoteIds.length > 0) {
          await pool.query('DELETE FROM case_notes WHERE id = ANY($1::uuid[])', [createdCaseNoteIds]);
        }
        if (createdCaseIds.length > 0) {
          await pool.query('DELETE FROM cases WHERE id = ANY($1::uuid[])', [createdCaseIds]);
        }
        await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);
        await pool.query('DELETE FROM user_account_access WHERE account_id = $1', [secondaryAccountId]);
        await pool.query('DELETE FROM accounts WHERE id = $1', [secondaryAccountId]);
      }
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
      expect(payload.email).toMatch(/^u\*+@example\.com$/);
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
      expect(updatedPayload.birth_date).toBe('1990-**-**');
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
      const createdEmail = payloadFromResponse<{ id: string; email_address: string }>(emailCreateResponse.body);

      const phoneCreateResponse = await withStaffAuth(request(app)
        .post(`/api/v2/contacts/${contactId}/phones`)
        .send({
          phone_number: '555-777-1000',
          label: 'other',
          is_primary: true,
        }))
        .expect(201);
      const createdPhone = payloadFromResponse<{ id: string; phone_number: string }>(phoneCreateResponse.body);

      const mobileCreateResponse = await withStaffAuth(request(app)
        .post(`/api/v2/contacts/${contactId}/phones`)
        .send({
          phone_number: '555-777-2000',
          label: 'mobile',
        }))
        .expect(201);
      const createdMobile = payloadFromResponse<{ id: string; phone_number: string }>(mobileCreateResponse.body);

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
      expect(detailPayload.email).toMatch(/^c\*+@example\.com$/);
      expect(detailPayload.phone).toBe('***-***-3000');
      expect(detailPayload.mobile_phone).toBeNull();
    });
  });

  describe('contact phone routes', () => {
    const createContactRecord = async (suffix: string): Promise<string> => {
      const createResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: `Phone-${suffix}`,
          last_name: 'Route',
        }))
        .expect(201);

      return payloadFromResponse<{ contact_id: string }>(createResponse.body).contact_id;
    };

    const createPhoneRecord = async (
      contactId: string,
      payload: { phone_number: string; label?: string; is_primary?: boolean }
    ): Promise<{ id: string; phone_number: string }> => {
      const response = await withStaffAuth(request(app)
        .post(`/api/v2/contacts/${contactId}/phones`)
        .send(payload))
        .expect(201);

      return payloadFromResponse<{ id: string; phone_number: string }>(response.body);
    };

    it('returns a validation error for duplicate phone creation', async () => {
      const suffix = unique();
      const contactId = await createContactRecord(suffix);

      await createPhoneRecord(contactId, {
        phone_number: '555-888-1000',
        label: 'home',
      });

      const duplicateResponse = await withStaffAuth(request(app)
        .post(`/api/v2/contacts/${contactId}/phones`)
        .send({
          phone_number: '555-888-1000',
          label: 'work',
        }))
        .expect(400);

      expect(duplicateResponse.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'This phone number already exists for this contact',
      });
    });

    it('returns a validation error for duplicate phone updates', async () => {
      const suffix = unique();
      const contactId = await createContactRecord(suffix);

      const primaryPhone = await createPhoneRecord(contactId, {
        phone_number: '555-888-2000',
        label: 'home',
      });
      const secondaryPhone = await createPhoneRecord(contactId, {
        phone_number: '555-888-2001',
        label: 'work',
      });

      const duplicateResponse = await withStaffAuth(request(app)
        .put(`/api/v2/contacts/phones/${secondaryPhone.id}`)
        .send({
          phone_number: primaryPhone.phone_number,
        }))
        .expect(400);

      expect(duplicateResponse.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'This phone number already exists for this contact',
      });
    });

    it('returns not found for missing phone routes', async () => {
      const missingPhoneId = '00000000-0000-0000-0000-000000000000';

      const getResponse = await withStaffAuth(request(app)
        .get(`/api/v2/contacts/phones/${missingPhoneId}`))
        .expect(404);
      expect(getResponse.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: 'Phone number not found',
      });

      const updateResponse = await withStaffAuth(request(app)
        .put(`/api/v2/contacts/phones/${missingPhoneId}`)
        .send({
          phone_number: '555-888-3000',
        }))
        .expect(404);
      expect(updateResponse.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: 'Phone number not found',
      });

      const deleteResponse = await withStaffAuth(request(app)
        .delete(`/api/v2/contacts/phones/${missingPhoneId}`))
        .expect(404);
      expect(deleteResponse.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: 'Phone number not found',
      });
    });
  });

  describe('contact relationship routes', () => {
    const createContactRecord = async (suffix: string): Promise<string> => {
      const createResponse = await withStaffAuth(request(app)
        .post('/api/v2/contacts')
        .send({
          account_id: testAccountId,
          first_name: `Relationship-${suffix}`,
          last_name: 'Route',
        }))
        .expect(201);

      return payloadFromResponse<{ contact_id: string }>(createResponse.body).contact_id;
    };

    const createRelationshipRecord = async (
      contactId: string,
      payload: Record<string, unknown>
    ): Promise<{ id: string }> => {
      const response = await withStaffAuth(request(app)
        .post(`/api/v2/contacts/${contactId}/relationships`)
        .send(payload))
        .expect(201);

      return payloadFromResponse<{ id: string }>(response.body);
    };

    const getRelationshipRows = async (contactId: string, relatedContactId: string) =>
      pool.query<{
        id: string;
        relationship_type: string;
        relationship_label: string | null;
        inverse_relationship_type: string | null;
        notes: string | null;
        is_bidirectional: boolean;
        is_active: boolean;
      }>(
        `SELECT id, relationship_type, relationship_label, inverse_relationship_type, notes, is_bidirectional, is_active
         FROM contact_relationships
         WHERE contact_id = $1 AND related_contact_id = $2
         ORDER BY created_at ASC, id ASC`,
        [contactId, relatedContactId]
      );

    it('creates bidirectional pairs and synchronizes inverse updates', async () => {
      const suffix = unique();
      const contactId = await createContactRecord(`${suffix}-primary`);
      const relatedContactId = await createContactRecord(`${suffix}-related`);

      const createdRelationship = await createRelationshipRecord(contactId, {
        related_contact_id: relatedContactId,
        relationship_type: 'parent',
        relationship_label: 'Mother',
        is_bidirectional: true,
        inverse_relationship_type: 'child',
        notes: 'Initial notes',
      });

      const createdRows = await getRelationshipRows(relatedContactId, contactId);
      expect(createdRows.rowCount).toBe(1);
      expect(createdRows.rows[0]).toMatchObject({
        relationship_type: 'child',
        relationship_label: 'Child',
        inverse_relationship_type: 'parent',
        notes: 'Initial notes',
        is_bidirectional: true,
        is_active: true,
      });

      await withStaffAuth(request(app)
        .put(`/api/v2/contacts/relationships/${createdRelationship.id}`)
        .send({
          relationship_label: 'Guardian',
          notes: 'Updated notes',
        }))
        .expect(200);

      const updatedPrimaryRows = await getRelationshipRows(contactId, relatedContactId);
      expect(updatedPrimaryRows.rows[0]).toMatchObject({
        relationship_label: 'Guardian',
        notes: 'Updated notes',
        is_bidirectional: true,
      });

      const updatedInverseRows = await getRelationshipRows(relatedContactId, contactId);
      expect(updatedInverseRows.rows[0]).toMatchObject({
        relationship_type: 'child',
        relationship_label: null,
        inverse_relationship_type: 'parent',
        notes: 'Updated notes',
        is_bidirectional: true,
        is_active: true,
      });
    });

    it('deactivates the inverse row when bidirectional is toggled off', async () => {
      const suffix = unique();
      const contactId = await createContactRecord(`${suffix}-primary`);
      const relatedContactId = await createContactRecord(`${suffix}-related`);

      const createdRelationship = await createRelationshipRecord(contactId, {
        related_contact_id: relatedContactId,
        relationship_type: 'parent',
        relationship_label: 'Mother',
        is_bidirectional: true,
        inverse_relationship_type: 'child',
      });

      await withStaffAuth(request(app)
        .put(`/api/v2/contacts/relationships/${createdRelationship.id}`)
        .send({
          is_bidirectional: false,
        }))
        .expect(200);

      const primaryRows = await getRelationshipRows(contactId, relatedContactId);
      expect(primaryRows.rows[0]).toMatchObject({
        is_bidirectional: false,
        is_active: true,
      });

      const inverseRows = await getRelationshipRows(relatedContactId, contactId);
      expect(inverseRows.rowCount).toBe(1);
      expect(inverseRows.rows[0]).toMatchObject({
        is_active: false,
      });
    });

    it('soft deletes the inverse row when one side is deleted', async () => {
      const suffix = unique();
      const contactId = await createContactRecord(`${suffix}-primary`);
      const relatedContactId = await createContactRecord(`${suffix}-related`);

      const createdRelationship = await createRelationshipRecord(contactId, {
        related_contact_id: relatedContactId,
        relationship_type: 'parent',
        relationship_label: 'Mother',
        is_bidirectional: true,
        inverse_relationship_type: 'child',
      });

      const inverseBeforeDelete = await getRelationshipRows(relatedContactId, contactId);
      const inverseRelationshipId = inverseBeforeDelete.rows[0]?.id;
      expect(inverseRelationshipId).toBeTruthy();

      await withStaffAuth(request(app)
        .delete(`/api/v2/contacts/relationships/${createdRelationship.id}`))
        .expect(204);

      const primaryRows = await getRelationshipRows(contactId, relatedContactId);
      expect(primaryRows.rows[0]).toMatchObject({
        is_active: false,
      });

      const inverseRows = await getRelationshipRows(relatedContactId, contactId);
      expect(inverseRows.rows[0]).toMatchObject({
        is_active: false,
      });

      await withStaffAuth(request(app)
        .get(`/api/v2/contacts/relationships/${inverseRelationshipId}`))
        .expect(404);
    });

    it('keeps bidirectional writes without an inverse type effectively one-way', async () => {
      const suffix = unique();
      const contactId = await createContactRecord(`${suffix}-primary`);
      const relatedContactId = await createContactRecord(`${suffix}-related`);

      const createdRelationship = await createRelationshipRecord(contactId, {
        related_contact_id: relatedContactId,
        relationship_type: 'friend',
        is_bidirectional: true,
        notes: 'One-way',
      });

      let inverseRows = await getRelationshipRows(relatedContactId, contactId);
      expect(inverseRows.rowCount).toBe(0);

      await withStaffAuth(request(app)
        .put(`/api/v2/contacts/relationships/${createdRelationship.id}`)
        .send({
          is_bidirectional: true,
          notes: 'Still one-way',
        }))
        .expect(200);

      inverseRows = await getRelationshipRows(relatedContactId, contactId);
      expect(inverseRows.rowCount).toBe(0);

      const primaryRows = await getRelationshipRows(contactId, relatedContactId);
      expect(primaryRows.rows[0]).toMatchObject({
        is_bidirectional: true,
        inverse_relationship_type: null,
        notes: 'Still one-way',
        is_active: true,
      });
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
      await withAdminAuth(request(app)
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
      await withAdminAuth(request(app)
        .delete('/api/v2/contacts/00000000-0000-0000-0000-000000000000')
      )
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/v2/contacts/1').expect(401);
    });
  });

  describe('POST /api/v2/contacts/:id/merge', () => {
    const createContact = async (
      token: string,
      organizationId: string,
      payload: Record<string, unknown>
    ): Promise<string> => {
      const response = await request(app)
        .post('/api/v2/contacts')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organizationId)
        .send(payload)
        .expect(201);

      const created = payloadFromResponse<{ contact_id?: string; id?: string }>(response.body);
      const contactId = created.contact_id ?? created.id;
      if (!contactId) {
        throw new Error('Failed to create test contact');
      }

      return contactId;
    };

    const createPhone = async (
      token: string,
      organizationId: string,
      contactId: string,
      payload: { phone_number: string; label?: string }
    ): Promise<void> => {
      await request(app)
        .post(`/api/v2/contacts/${contactId}/phones`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organizationId)
        .send(payload)
        .expect(201);
    };

    const createEmail = async (
      token: string,
      organizationId: string,
      contactId: string,
      payload: { email_address: string; label?: string }
    ): Promise<void> => {
      await request(app)
        .post(`/api/v2/contacts/${contactId}/emails`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organizationId)
        .send(payload)
        .expect(201);
    };

    const createRelationship = async (
      token: string,
      organizationId: string,
      contactId: string,
      payload: Record<string, unknown>
    ): Promise<void> => {
      await request(app)
        .post(`/api/v2/contacts/${contactId}/relationships`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organizationId)
        .send(payload)
        .expect(201);
    };

    const createVolunteer = async (
      token: string,
      organizationId: string,
      payload: Record<string, unknown>
    ): Promise<void> => {
      await request(app)
        .post('/api/v2/volunteers')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organizationId)
        .send(payload)
        .expect(201);
    };

    const cleanupAccount = async (accountId: string): Promise<void> => {
      await pool.query('DELETE FROM contacts WHERE account_id = $1', [accountId]);
      await pool.query('DELETE FROM user_account_access WHERE account_id = $1', [accountId]);
      await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
    };

    it('merges linked records and volunteer data without dropping information', async () => {
      const relatedContactId = await createContact(authToken, testAccountId, {
        account_id: testAccountId,
        first_name: 'Jordan',
        last_name: 'Related',
      });
      const sourceContactId = await createContact(staffAuthToken, testAccountId, {
        account_id: testAccountId,
        first_name: 'Taylor',
        last_name: 'Merge',
      });
      const targetContactId = await createContact(staffAuthToken, testAccountId, {
        account_id: testAccountId,
        first_name: 'Alex',
        last_name: 'Merge',
      });

      await createPhone(staffAuthToken, testAccountId, sourceContactId, {
        phone_number: '555-123-4567',
        label: 'home',
      });
      await createPhone(staffAuthToken, testAccountId, targetContactId, {
        phone_number: '(555) 123-4567',
        label: 'mobile',
      });
      await createEmail(staffAuthToken, testAccountId, sourceContactId, {
        email_address: 'merge-test@example.com',
        label: 'personal',
      });
      await createEmail(staffAuthToken, testAccountId, targetContactId, {
        email_address: 'merge-test@example.com',
        label: 'work',
      });
      await createRelationship(staffAuthToken, testAccountId, sourceContactId, {
        related_contact_id: relatedContactId,
        relationship_type: 'friend',
        relationship_label: 'Source friend',
        is_bidirectional: false,
        notes: 'source relationship',
      });
      await createRelationship(staffAuthToken, testAccountId, targetContactId, {
        related_contact_id: relatedContactId,
        relationship_type: 'friend',
        relationship_label: 'Target friend',
        is_bidirectional: false,
        notes: 'target relationship',
      });
      await createVolunteer(staffAuthToken, testAccountId, {
        contact_id: sourceContactId,
        skills: ['Teaching', 'Mentoring'],
        availability_status: 'limited',
        availability_notes: 'Weekends',
        background_check_status: 'approved',
        preferred_roles: ['Coordinator'],
        certifications: ['CPR'],
        max_hours_per_week: 12,
        emergency_contact_name: 'Sam Source',
        emergency_contact_phone: '555-999-0000',
        emergency_contact_relationship: 'Sibling',
      });
      await createVolunteer(staffAuthToken, testAccountId, {
        contact_id: targetContactId,
        skills: ['Driving', 'Mentoring'],
        availability_status: 'available',
        availability_notes: 'Mornings',
        background_check_status: 'approved',
        preferred_roles: ['Coordinator', 'Driver'],
        certifications: ['First Aid'],
        max_hours_per_week: 8,
        emergency_contact_name: 'Sam Source',
        emergency_contact_phone: '555-999-0000',
        emergency_contact_relationship: 'Sibling',
      });

      const previewResponse = await withStaffAuth(
        request(app)
          .get(`/api/v2/contacts/${sourceContactId}/merge-preview`)
          .query({ target_contact_id: targetContactId })
      ).expect(200);
      const preview = payloadFromResponse<{
        fields: Array<{ field: string; conflict: boolean }>;
      }>(previewResponse.body);
      expect(preview.fields.some((field) => field.field === 'first_name' && field.conflict)).toBe(true);
      expect(preview.fields.some((field) => field.field === 'availability_status' && field.conflict)).toBe(true);

      const mergeResponse = await withStaffAuth(
        request(app)
          .post(`/api/v2/contacts/${sourceContactId}/merge`)
          .send({
            target_contact_id: targetContactId,
            resolutions: {
              first_name: 'source',
              availability_status: 'source',
            },
          })
      ).expect(200);

      const mergePayload = payloadFromResponse<{
        survivor_contact: { contact_id: string; first_name: string; is_active: boolean };
        merge_summary: { merged_fields: string[]; moved_counts: Record<string, number> };
      }>(mergeResponse.body);

      expect(mergePayload.survivor_contact.contact_id).toBe(targetContactId);
      expect(mergePayload.survivor_contact.first_name).toBe('Taylor');
      expect(mergePayload.merge_summary.merged_fields).toEqual(
        expect.arrayContaining(['first_name', 'availability_status', 'roles'])
      );

      const sourceDetailResponse = await withStaffAuth(
        request(app).get(`/api/v2/contacts/${sourceContactId}`)
      ).expect(200);
      const sourceDetail = payloadFromResponse<{
        is_active: boolean;
        phone_count: number;
        email_count: number;
        relationship_count: number;
      }>(sourceDetailResponse.body);
      expect(sourceDetail.is_active).toBe(false);
      expect(sourceDetail.phone_count).toBe(0);
      expect(sourceDetail.email_count).toBe(0);
      expect(sourceDetail.relationship_count).toBe(0);

      const targetDetailResponse = await withStaffAuth(
        request(app).get(`/api/v2/contacts/${targetContactId}`)
      ).expect(200);
      const targetDetail = payloadFromResponse<{
        is_active: boolean;
        phone_count: number;
        email_count: number;
        relationship_count: number;
      }>(targetDetailResponse.body);
      expect(targetDetail.is_active).toBe(true);
      expect(targetDetail.phone_count).toBe(1);
      expect(targetDetail.email_count).toBe(1);
      expect(targetDetail.relationship_count).toBe(1);

      const targetPhoneRows = await pool.query<{ phone_number: string; label: string }>(
        'SELECT phone_number, label FROM contact_phone_numbers WHERE contact_id = $1 ORDER BY created_at ASC, id ASC',
        [targetContactId]
      );
      expect(targetPhoneRows.rowCount).toBe(1);
      expect(targetPhoneRows.rows[0]?.phone_number).toBe('(555) 123-4567');
      expect(targetPhoneRows.rows[0]?.label).toBe('mobile');

      const targetEmailRows = await pool.query<{ email_address: string; label: string }>(
        'SELECT email_address, label FROM contact_email_addresses WHERE contact_id = $1 ORDER BY created_at ASC, id ASC',
        [targetContactId]
      );
      expect(targetEmailRows.rowCount).toBe(1);
      expect(targetEmailRows.rows[0]?.email_address).toBe('merge-test@example.com');

      const targetRelationshipRows = await pool.query<{ related_contact_id: string; notes: string | null }>(
        'SELECT related_contact_id, notes FROM contact_relationships WHERE contact_id = $1 AND is_active = true',
        [targetContactId]
      );
      expect(targetRelationshipRows.rowCount).toBe(1);
      expect(targetRelationshipRows.rows[0]?.related_contact_id).toBe(relatedContactId);

      const targetVolunteerRows = await pool.query<{
        skills: string[] | null;
        availability_status: string | null;
        is_active: boolean | null;
      }>(
        `SELECT skills, availability_status, is_active
         FROM volunteers
         WHERE contact_id = $1
         ORDER BY is_active DESC NULLS LAST, updated_at DESC, created_at ASC, id ASC`,
        [targetContactId]
      );
      expect(targetVolunteerRows.rowCount).toBeGreaterThan(0);
      expect(targetVolunteerRows.rows[0]?.skills).toEqual(
        expect.arrayContaining(['Teaching', 'Mentoring', 'Driving'])
      );
      expect(targetVolunteerRows.rows[0]?.availability_status).toBe('limited');
      expect(targetVolunteerRows.rows[0]?.is_active).toBe(true);
    });

    it('rejects self merges with a validation error', async () => {
      const contactId = await createContact(staffAuthToken, testAccountId, {
        account_id: testAccountId,
        first_name: 'Self',
        last_name: 'Merge',
      });

      await expect(
        contactService.mergeContacts(
          contactId,
          {
            target_contact_id: contactId,
            resolutions: {},
          },
          staffUserId,
          undefined,
          'staff'
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'validation_error',
      });
    });

    it('rejects cross-organization merges with a validation error', async () => {
      const secondaryAccountResponse = await request(app)
        .post('/api/v2/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_name: `Merge Cross Org ${unique()}`,
          account_type: 'organization',
        })
        .expect(201);
      const secondaryAccountId = accountIdFromResponse(secondaryAccountResponse.body);
      expect(secondaryAccountId).toBeTruthy();

      if (!secondaryAccountId) {
        throw new Error('Failed to create secondary account');
      }

      await pool.query(
        `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
         VALUES ($1, $2, 'staff', $3, TRUE)
         ON CONFLICT (user_id, account_id)
         DO UPDATE SET access_level = EXCLUDED.access_level, granted_by = EXCLUDED.granted_by, is_active = TRUE`,
        [staffUserId, secondaryAccountId, creatorUserId]
      );

      try {
        const sourceContactId = await createContact(authToken, testAccountId, {
          account_id: testAccountId,
          first_name: 'Cross',
          last_name: 'Source',
        });
        const targetContactId = await createContact(staffAuthToken, secondaryAccountId, {
          account_id: secondaryAccountId,
          first_name: 'Cross',
          last_name: 'Target',
        });

        await expect(
          contactService.mergeContacts(
            sourceContactId,
            {
              target_contact_id: targetContactId,
              resolutions: {},
            },
            staffUserId,
            undefined,
            'staff'
          )
        ).rejects.toMatchObject({
          statusCode: 400,
          code: 'validation_error',
        });
      } finally {
        await cleanupAccount(secondaryAccountId);
      }
    });

    it('rolls back linked record changes when volunteer validation fails', async () => {
      const sourceContactId = await createContact(staffAuthToken, testAccountId, {
        account_id: testAccountId,
        first_name: 'Rollback',
        last_name: 'Shared',
      });
      const targetContactId = await createContact(staffAuthToken, testAccountId, {
        account_id: testAccountId,
        first_name: 'Safe',
        last_name: 'Shared',
      });

      await createPhone(staffAuthToken, testAccountId, sourceContactId, {
        phone_number: '555-700-1000',
        label: 'home',
      });
      await createVolunteer(staffAuthToken, testAccountId, {
        contact_id: sourceContactId,
        skills: ['Teaching'],
        availability_status: 'limited',
      });
      await createVolunteer(staffAuthToken, testAccountId, {
        contact_id: targetContactId,
        skills: ['Driving'],
        availability_status: 'available',
      });

      await expect(
        contactService.mergeContacts(
          sourceContactId,
          {
            target_contact_id: targetContactId,
            resolutions: {
              first_name: 'target',
            },
          },
          staffUserId,
          undefined,
          'staff'
        )
      ).rejects.toThrow(/Missing merge resolution for field 'availability_status'/);

      const sourceDetailResponse = await withStaffAuth(
        request(app).get(`/api/v2/contacts/${sourceContactId}`)
      ).expect(200);
      const sourceDetail = payloadFromResponse<{
        is_active: boolean;
        first_name: string;
        phone_count: number;
      }>(sourceDetailResponse.body);
      expect(sourceDetail.is_active).toBe(true);
      expect(sourceDetail.first_name).toBe('Rollback');
      expect(sourceDetail.phone_count).toBe(1);

      const targetDetailResponse = await withStaffAuth(
        request(app).get(`/api/v2/contacts/${targetContactId}`)
      ).expect(200);
      const targetDetail = payloadFromResponse<{
        first_name: string;
        phone_count: number;
      }>(targetDetailResponse.body);
      expect(targetDetail.first_name).toBe('Safe');
      expect(targetDetail.phone_count).toBe(0);

      const targetPhoneRows = await pool.query(
        'SELECT COUNT(*)::int AS count FROM contact_phone_numbers WHERE contact_id = $1',
        [targetContactId]
      );
      expect(targetPhoneRows.rows[0]?.count).toBe(0);

      const sourcePhoneRows = await pool.query(
        'SELECT COUNT(*)::int AS count FROM contact_phone_numbers WHERE contact_id = $1',
        [sourceContactId]
      );
      expect(sourcePhoneRows.rows[0]?.count).toBe(1);
    });
  });
});
