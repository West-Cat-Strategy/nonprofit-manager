/**
 * Authorization Integration Tests
 * Tests role-based access control and permission checking across all CRUD operations
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Authorization Integration Tests', () => {
  // Store tokens for different user roles
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};
  const testUsers: Array<{
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  }> = [];
  const testData: Record<string, string> = {};
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;
  let defaultOrganizationId: string | null = null;
  const ensureTestUsersExist = async (): Promise<void> => {
    for (const testUser of testUsers) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
         ON CONFLICT (id)
         DO UPDATE SET
           email = EXCLUDED.email,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           role = EXCLUDED.role,
           is_active = true,
           updated_at = NOW()`,
        [
          testUser.id,
          testUser.email,
          '$2b$10$2B5xCiFv0to6v3sQm6rQOu/xM2bYf7jdd2fNf7q5sWubEjkVif7PO',
          testUser.firstName,
          testUser.lastName,
          testUser.role,
        ]
      );

      try {
        const roleResult = await pool.query<{ id: string }>('SELECT id FROM roles WHERE name = $1', [
          testUser.role,
        ]);
        if (roleResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [testUser.id, roleResult.rows[0].id]
          );
        }
      } catch {
        // Role tables may not exist yet - that's ok for basic auth tests
      }
    }
  };

  beforeAll(async () => {
    // Create test users with different roles
    const roles = ['admin', 'manager', 'staff', 'volunteer', 'viewer'];
    const password = 'Test123!Strong';

    for (const role of roles) {
      const email = `auth-test-${role}-${unique()}@example.com`;
      const firstName = 'Test';
      const lastName = role.charAt(0).toUpperCase() + role.slice(1);
      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          email,
          password,
          password_confirm: password,
          first_name: firstName,
          last_name: lastName,
        });

      const registered = unwrap<{
        user?: {
          id: string;
        };
      }>(response.body);
      let resolvedUserId = registered.user?.id;

      if (!resolvedUserId) {
        const createdUser = await pool.query<{ id: string }>(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
           RETURNING id`,
          [email, '$2b$10$2B5xCiFv0to6v3sQm6rQOu/xM2bYf7jdd2fNf7q5sWubEjkVif7PO', firstName, lastName, role]
        );
        resolvedUserId = createdUser.rows[0].id;
      }

      userIds[role] = resolvedUserId;
      testUsers.push({
        id: userIds[role],
        email,
        role,
        firstName,
        lastName,
      });

      // Update user role in database (bypass normal flow for testing)
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userIds[role]]);

      // Assign user to role in user_roles table if it exists
      try {
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
        if (roleResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userIds[role], roleResult.rows[0].id]
          );
        }
      } catch {
        // Role tables may not exist yet - that's ok for basic auth tests
      }
    }
    await ensureTestUsersExist();

    const orgResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM accounts
       WHERE account_type = 'organization'
         AND COALESCE(is_active, true) = true
       ORDER BY created_at ASC
       LIMIT 1`
    );
    defaultOrganizationId = orgResult.rows[0]?.id ?? null;

    if (!defaultOrganizationId) {
      const createdOrganization = await pool.query<{ id: string }>(
        `INSERT INTO accounts (account_name, account_type, created_by, modified_by, created_at, updated_at)
         VALUES ($1, 'organization', $2, $2, NOW(), NOW())
         RETURNING id`,
        [`Authorization Test Organization ${unique()}`, userIds.admin]
      );
      defaultOrganizationId = createdOrganization.rows[0].id;
    }

    for (const role of roles) {
      tokens[role] = jwt.sign(
        {
          id: userIds[role],
          email: testUsers.find((user) => user.role === role)?.email ?? `auth-${role}-${unique()}@example.com`,
          role,
          ...(defaultOrganizationId ? { organizationId: defaultOrganizationId } : {}),
        },
        getJwtSecret(),
        { expiresIn: '1h' }
      );
    }

    // Create test data using admin user
    const accountResponse = await request(app)
      .post('/api/v2/accounts')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        account_name: 'Auth Test Organization',
        account_type: 'organization',
        category: 'donor',
      });

    const accountPayload = unwrap<{ account_id?: string; id?: string }>(accountResponse.body);
    if (accountPayload.account_id || accountPayload.id) {
      testData.accountId = accountPayload.account_id ?? accountPayload.id ?? '';
    }

    // Create a test contact
    const contactResponse = await request(app)
      .post('/api/v2/contacts')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        first_name: 'Auth',
        last_name: 'TestContact',
        email: `auth-test-contact-${unique()}@example.com`,
        account_id: testData.accountId,
      });

    const contactPayload = unwrap<{ contact_id?: string; id?: string }>(contactResponse.body);
    if (contactPayload.contact_id || contactPayload.id) {
      testData.contactId = contactPayload.contact_id ?? contactPayload.id ?? '';
    }
  });

  beforeEach(async () => {
    await ensureTestUsersExist();
  });

  afterAll(async () => {
    // Clean up test data
    const testUserIds = Object.values(userIds);
    if (testUserIds.length > 0) {
      // Remove dependent rows before deleting accounts created by test users.
      await pool.query(
        `DELETE FROM volunteers
         WHERE contact_id IN (
           SELECT id
           FROM contacts
           WHERE account_id IN (
             SELECT id
             FROM accounts
             WHERE created_by = ANY($1::uuid[])
           )
         )`,
        [testUserIds]
      );
      await pool.query(
        `DELETE FROM contacts
         WHERE account_id IN (
           SELECT id
           FROM accounts
           WHERE created_by = ANY($1::uuid[])
         )`,
        [testUserIds]
      );
      await pool.query(
        `DELETE FROM donations
         WHERE account_id IN (
           SELECT id
           FROM accounts
           WHERE created_by = ANY($1::uuid[])
         )`,
        [testUserIds]
      );
      // Accounts reference users via created_by; remove account rows before deleting users.
      await pool.query('DELETE FROM accounts WHERE created_by = ANY($1::uuid[])', [testUserIds]);
    }
    if (testData.contactId) {
      await pool.query('DELETE FROM contacts WHERE id = $1', [testData.contactId]);
    }
    if (testData.accountId) {
      await pool.query('DELETE FROM accounts WHERE id = $1', [testData.accountId]);
    }
    for (const userId of testUserIds) {
      // user_roles table may not exist if migration hasn't run
      try {
        await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      } catch {
        // Ignore if table doesn't exist
      }
      try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      } catch {
        // Ignore FK cleanup failures; test users are uniquely namespaced per run.
      }
    }
  });

  describe('Account CRUD Authorization', () => {
    describe('GET /api/v2/accounts', () => {
      it('should allow authenticated users to list accounts', async () => {
        for (const role of ['admin', 'manager', 'staff']) {
          const response = await request(app)
            .get('/api/v2/accounts')
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('data');
        }
      });

      it('should require authentication', async () => {
        const response = await request(app).get('/api/v2/accounts');
        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v2/accounts/:id', () => {
      it('should allow authenticated users to view account details', async () => {
        if (!testData.accountId) return;

        for (const role of ['admin', 'manager', 'staff']) {
          const response = await request(app)
            .get(`/api/v2/accounts/${testData.accountId}`)
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('account_name');
        }
      });
    });

    describe('POST /api/v2/accounts', () => {
      it('should allow admin to create accounts', async () => {
        const response = await request(app)
          .post('/api/v2/accounts')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            account_name: 'Admin Created Account',
            account_type: 'individual',
            category: 'donor',
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdAccount = unwrap<{ account_id?: string; id?: string }>(response.body);
        const createdAccountId = createdAccount.account_id ?? createdAccount.id;
        if (createdAccountId) {
          await pool.query('DELETE FROM accounts WHERE id = $1', [createdAccountId]);
        }
      });

      it('should allow manager to create accounts', async () => {
        const response = await request(app)
          .post('/api/v2/accounts')
          .set('Authorization', `Bearer ${tokens.manager}`)
          .send({
            account_name: 'Manager Created Account',
            account_type: 'individual',
            category: 'donor',
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdAccount = unwrap<{ account_id?: string; id?: string }>(response.body);
        const createdAccountId = createdAccount.account_id ?? createdAccount.id;
        if (createdAccountId) {
          await pool.query('DELETE FROM accounts WHERE id = $1', [createdAccountId]);
        }
      });

      it('should allow staff to create accounts', async () => {
        const response = await request(app)
          .post('/api/v2/accounts')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            account_name: 'Staff Created Account',
            account_type: 'individual',
            category: 'donor',
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdAccount = unwrap<{ account_id?: string; id?: string }>(response.body);
        const createdAccountId = createdAccount.account_id ?? createdAccount.id;
        if (createdAccountId) {
          await pool.query('DELETE FROM accounts WHERE id = $1', [createdAccountId]);
        }
      });
    });

    describe('PUT /api/v2/accounts/:id', () => {
      it('should allow admin to update accounts', async () => {
        if (!testData.accountId) return;

        const response = await request(app)
          .put(`/api/v2/accounts/${testData.accountId}`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            account_name: 'Updated by Admin',
          });

        expect(response.status).toBe(200);
        const payload = unwrap<{ account_name?: string }>(response.body);
        expect(payload.account_name).toBe('Updated by Admin');
      });

      it('should allow manager to update accounts', async () => {
        if (!testData.accountId) return;

        const response = await request(app)
          .put(`/api/v2/accounts/${testData.accountId}`)
          .set('Authorization', `Bearer ${tokens.manager}`)
          .send({
            account_name: 'Updated by Manager',
          });

        expect(response.status).toBe(200);
      });
    });

    describe('DELETE /api/v2/accounts/:id', () => {
      it('should allow admin to delete accounts', async () => {
        // Create account to delete
        const createResponse = await request(app)
          .post('/api/v2/accounts')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            account_name: 'Account to Delete',
            account_type: 'individual',
            category: 'donor',
          });

        const accountId = createResponse.body.id;
        if (!accountId) return;

        const response = await request(app)
          .delete(`/api/v2/accounts/${accountId}`)
          .set('Authorization', `Bearer ${tokens.admin}`);

        expect(response.status).toBe(204);
      });
    });
  });

  describe('Contact CRUD Authorization', () => {
    describe('GET /api/v2/contacts', () => {
      it('should allow authenticated users to list contacts', async () => {
        for (const role of ['admin', 'manager', 'staff']) {
          const response = await request(app)
            .get('/api/v2/contacts')
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('data');
        }
      });

      it('should require authentication', async () => {
        const response = await request(app).get('/api/v2/contacts');
        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/v2/contacts', () => {
      it('should allow admin to create contacts', async () => {
        const response = await request(app)
          .post('/api/v2/contacts')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            first_name: 'Admin',
            last_name: 'Contact',
            email: `admin-contact-${unique()}@example.com`,
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdContact = unwrap<{ contact_id?: string; id?: string }>(response.body);
        const createdContactId = createdContact.contact_id ?? createdContact.id;
        if (createdContactId) {
          await pool.query('DELETE FROM contacts WHERE id = $1', [createdContactId]);
        }
      });

      it('should allow staff to create contacts', async () => {
        const response = await request(app)
          .post('/api/v2/contacts')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            first_name: 'Staff',
            last_name: 'Contact',
            email: `staff-contact-${unique()}@example.com`,
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdContact = unwrap<{ contact_id?: string; id?: string }>(response.body);
        const createdContactId = createdContact.contact_id ?? createdContact.id;
        if (createdContactId) {
          await pool.query('DELETE FROM contacts WHERE id = $1', [createdContactId]);
        }
      });
    });

    describe('PUT /api/v2/contacts/:id', () => {
      it('should allow admin to update contacts', async () => {
        if (!testData.contactId) return;

        const response = await request(app)
          .put(`/api/v2/contacts/${testData.contactId}`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            first_name: 'UpdatedByAdmin',
          });

        expect(response.status).toBe(200);
      });
    });
  });

  describe('Donation CRUD Authorization', () => {
    let testDonationId: string;

    describe('POST /api/v2/donations', () => {
      it('should allow admin to create donations', async () => {
        if (!testData.accountId) return;

        const response = await request(app)
          .post('/api/v2/donations')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            account_id: testData.accountId,
            amount: 100.0,
            donation_date: '2024-01-15',
            payment_method: 'credit_card',
          });

        expect(response.status).toBe(201);
        testDonationId = response.body.id;
      });

      it('should require authentication', async () => {
        const response = await request(app).post('/api/v2/donations').send({
          account_id: testData.accountId,
          amount: 50.0,
          donation_date: '2024-01-15',
        });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v2/donations', () => {
      it('should allow authenticated users to list donations', async () => {
        const response = await request(app)
          .get('/api/v2/donations')
          .set('Authorization', `Bearer ${tokens.admin}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      });
    });

    afterAll(async () => {
      if (testDonationId) {
        await pool.query('DELETE FROM donations WHERE id = $1', [testDonationId]);
      }
    });
  });

  describe('Event CRUD Authorization', () => {
    let testEventId: string;

    describe('POST /api/v2/events', () => {
      it('should allow admin to create events', async () => {
        const response = await request(app)
          .post('/api/v2/events')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            event_name: 'Admin Test Event',
            event_type: 'fundraiser',
            status: 'planned',
            start_date: '2024-06-01T10:00:00Z',
            end_date: '2024-06-01T14:00:00Z',
          });

        expect(response.status).toBe(201);
        testEventId = response.body.data?.event_id ?? response.body.event_id ?? response.body.id;
      });

      it('should require authentication', async () => {
        const response = await request(app).post('/api/v2/events').send({
          event_name: 'Unauthorized Event',
          event_type: 'meeting',
        });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v2/events', () => {
      it('should allow authenticated users to list events', async () => {
        for (const role of ['admin', 'manager', 'staff', 'volunteer']) {
          const response = await request(app)
            .get('/api/v2/events')
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
        }
      });
    });

    afterAll(async () => {
      if (testEventId) {
        await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
      }
    });
  });

  describe('Task CRUD Authorization', () => {
    let testTaskId: string;

    describe('POST /api/v2/tasks', () => {
      it('should allow admin to create tasks', async () => {
        const response = await request(app)
          .post('/api/v2/tasks')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            subject: 'Admin Test Task',
            priority: 'high',
          });

        expect(response.status).toBe(201);
        testTaskId = response.body.id;
      });

      it('should allow staff to create tasks', async () => {
        const response = await request(app)
          .post('/api/v2/tasks')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            subject: 'Staff Test Task',
            priority: 'normal',
          });

        expect(response.status).toBe(201);

        // Clean up
        if (response.body.id) {
          await pool.query('DELETE FROM tasks WHERE id = $1', [response.body.id]);
        }
      });
    });

    describe('GET /api/v2/tasks', () => {
      it('should allow authenticated users to list tasks', async () => {
        const response = await request(app)
          .get('/api/v2/tasks')
          .set('Authorization', `Bearer ${tokens.admin}`);

        expect(response.status).toBe(200);
      });
    });

    afterAll(async () => {
      if (testTaskId) {
        await pool.query('DELETE FROM tasks WHERE id = $1', [testTaskId]);
      }
    });
  });

  describe('Volunteer CRUD Authorization', () => {
    let testVolunteerId: string;

    describe('POST /api/v2/volunteers', () => {
      it('should allow admin to create volunteers', async () => {
        if (!testData.contactId) return;

        const response = await request(app)
          .post('/api/v2/volunteers')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            contact_id: testData.contactId,
            skills: ['Teaching', 'Organizing'],
            availability_status: 'available',
          });

        expect(response.status).toBe(201);
        testVolunteerId = response.body.id;
      });

      it('should require authentication', async () => {
        const response = await request(app).post('/api/v2/volunteers').send({
          contact_id: testData.contactId,
          skills: ['Testing'],
        });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v2/volunteers', () => {
      it('should allow authenticated users to list volunteers', async () => {
        const response = await request(app)
          .get('/api/v2/volunteers')
          .set('Authorization', `Bearer ${tokens.admin}`);

        expect(response.status).toBe(200);
      });
    });

    afterAll(async () => {
      if (testVolunteerId) {
        await pool.query('DELETE FROM volunteers WHERE id = $1', [testVolunteerId]);
      }
    });
  });

  describe('Invalid Token Tests', () => {
    it('should reject expired tokens', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjA5NDU5MjAwLCJleHAiOjE2MDk0NTkyMDF9.invalid';

      const response = await request(app)
        .get('/api/v2/accounts')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject malformed tokens', async () => {
      const response = await request(app)
        .get('/api/v2/accounts')
        .set('Authorization', 'Bearer not-a-valid-token');

      expect(response.status).toBe(401);
    });

    it('should reject missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/v2/accounts')
        .set('Authorization', tokens.admin);

      expect(response.status).toBe(401);
    });
  });
});
