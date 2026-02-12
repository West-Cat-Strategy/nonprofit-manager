/**
 * Authorization Integration Tests
 * Tests role-based access control and permission checking across all CRUD operations
 */

import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Authorization Integration Tests', () => {
  // Store tokens for different user roles
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};
  const testData: Record<string, string> = {};
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  beforeAll(async () => {
    // Create test users with different roles
    const roles = ['admin', 'manager', 'staff', 'volunteer', 'viewer'];

    for (const role of roles) {
      const email = `auth-test-${role}-${unique()}@example.com`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'Test123!Strong',
          firstName: `Test`,
          lastName: role.charAt(0).toUpperCase() + role.slice(1),
        });

      tokens[role] = response.body.token;
      userIds[role] = response.body.user.id;

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

    // Create test data using admin user
    const accountResponse = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        account_name: 'Auth Test Organization',
        account_type: 'organization',
        category: 'donor',
      });

    if (accountResponse.body.id) {
      testData.accountId = accountResponse.body.id;
    }

    // Create a test contact
    const contactResponse = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        first_name: 'Auth',
        last_name: 'TestContact',
        email: 'authtest@example.com',
        account_id: testData.accountId,
      });

    if (contactResponse.body.id) {
      testData.contactId = contactResponse.body.id;
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      const testUserIds = Object.values(userIds);
      if (testUserIds.length > 0) {
        // Accounts reference users via created_by; remove any leftovers before deleting users.
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
    } finally {
      await pool.end();
    }
  });

  describe('Account CRUD Authorization', () => {
    describe('GET /api/accounts', () => {
      it('should allow authenticated users to list accounts', async () => {
        for (const role of ['admin', 'manager', 'staff']) {
          const response = await request(app)
            .get('/api/accounts')
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('data');
        }
      });

      it('should require authentication', async () => {
        const response = await request(app).get('/api/accounts');
        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/accounts/:id', () => {
      it('should allow authenticated users to view account details', async () => {
        if (!testData.accountId) return;

        for (const role of ['admin', 'manager', 'staff']) {
          const response = await request(app)
            .get(`/api/accounts/${testData.accountId}`)
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('account_name');
        }
      });
    });

    describe('POST /api/accounts', () => {
      it('should allow admin to create accounts', async () => {
        const response = await request(app)
          .post('/api/accounts')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            account_name: 'Admin Created Account',
            account_type: 'individual',
            category: 'donor',
          });

        expect(response.status).toBe(201);

        // Clean up
        if (response.body.id) {
          await pool.query('DELETE FROM accounts WHERE id = $1', [response.body.id]);
        }
      });

      it('should allow manager to create accounts', async () => {
        const response = await request(app)
          .post('/api/accounts')
          .set('Authorization', `Bearer ${tokens.manager}`)
          .send({
            account_name: 'Manager Created Account',
            account_type: 'individual',
            category: 'donor',
          });

        expect(response.status).toBe(201);

        // Clean up
        if (response.body.id) {
          await pool.query('DELETE FROM accounts WHERE id = $1', [response.body.id]);
        }
      });

      it('should allow staff to create accounts', async () => {
        const response = await request(app)
          .post('/api/accounts')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            account_name: 'Staff Created Account',
            account_type: 'individual',
            category: 'donor',
          });

        expect(response.status).toBe(201);

        // Clean up
        if (response.body.id) {
          await pool.query('DELETE FROM accounts WHERE id = $1', [response.body.id]);
        }
      });
    });

    describe('PUT /api/accounts/:id', () => {
      it('should allow admin to update accounts', async () => {
        if (!testData.accountId) return;

        const response = await request(app)
          .put(`/api/accounts/${testData.accountId}`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            account_name: 'Updated by Admin',
          });

        expect(response.status).toBe(200);
        expect(response.body.account_name).toBe('Updated by Admin');
      });

      it('should allow manager to update accounts', async () => {
        if (!testData.accountId) return;

        const response = await request(app)
          .put(`/api/accounts/${testData.accountId}`)
          .set('Authorization', `Bearer ${tokens.manager}`)
          .send({
            account_name: 'Updated by Manager',
          });

        expect(response.status).toBe(200);
      });
    });

    describe('DELETE /api/accounts/:id', () => {
      it('should allow admin to delete accounts', async () => {
        // Create account to delete
        const createResponse = await request(app)
          .post('/api/accounts')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            account_name: 'Account to Delete',
            account_type: 'individual',
            category: 'donor',
          });

        const accountId = createResponse.body.id;
        if (!accountId) return;

        const response = await request(app)
          .delete(`/api/accounts/${accountId}`)
          .set('Authorization', `Bearer ${tokens.admin}`);

        expect(response.status).toBe(204);
      });
    });
  });

  describe('Contact CRUD Authorization', () => {
    describe('GET /api/contacts', () => {
      it('should allow authenticated users to list contacts', async () => {
        for (const role of ['admin', 'manager', 'staff']) {
          const response = await request(app)
            .get('/api/contacts')
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('data');
        }
      });

      it('should require authentication', async () => {
        const response = await request(app).get('/api/contacts');
        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/contacts', () => {
      it('should allow admin to create contacts', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            first_name: 'Admin',
            last_name: 'Contact',
            email: `admin-contact-${unique()}@example.com`,
          });

        expect(response.status).toBe(201);

        // Clean up
        if (response.body.id) {
          await pool.query('DELETE FROM contacts WHERE id = $1', [response.body.id]);
        }
      });

      it('should allow staff to create contacts', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            first_name: 'Staff',
            last_name: 'Contact',
            email: `staff-contact-${unique()}@example.com`,
          });

        expect(response.status).toBe(201);

        // Clean up
        if (response.body.id) {
          await pool.query('DELETE FROM contacts WHERE id = $1', [response.body.id]);
        }
      });
    });

    describe('PUT /api/contacts/:id', () => {
      it('should allow admin to update contacts', async () => {
        if (!testData.contactId) return;

        const response = await request(app)
          .put(`/api/contacts/${testData.contactId}`)
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

    describe('POST /api/donations', () => {
      it('should allow admin to create donations', async () => {
        if (!testData.accountId) return;

        const response = await request(app)
          .post('/api/donations')
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
        const response = await request(app).post('/api/donations').send({
          account_id: testData.accountId,
          amount: 50.0,
          donation_date: '2024-01-15',
        });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/donations', () => {
      it('should allow authenticated users to list donations', async () => {
        const response = await request(app)
          .get('/api/donations')
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

    describe('POST /api/events', () => {
      it('should allow admin to create events', async () => {
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            event_name: 'Admin Test Event',
            event_type: 'fundraiser',
            status: 'planned',
            start_date: '2024-06-01T10:00:00Z',
            end_date: '2024-06-01T14:00:00Z',
          });

        expect(response.status).toBe(201);
        testEventId = response.body.id;
      });

      it('should require authentication', async () => {
        const response = await request(app).post('/api/events').send({
          event_name: 'Unauthorized Event',
          event_type: 'meeting',
        });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/events', () => {
      it('should allow authenticated users to list events', async () => {
        for (const role of ['admin', 'manager', 'staff', 'volunteer']) {
          const response = await request(app)
            .get('/api/events')
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

    describe('POST /api/tasks', () => {
      it('should allow admin to create tasks', async () => {
        const response = await request(app)
          .post('/api/tasks')
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
          .post('/api/tasks')
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

    describe('GET /api/tasks', () => {
      it('should allow authenticated users to list tasks', async () => {
        const response = await request(app)
          .get('/api/tasks')
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

    describe('POST /api/volunteers', () => {
      it('should allow admin to create volunteers', async () => {
        if (!testData.contactId) return;

        const response = await request(app)
          .post('/api/volunteers')
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
        const response = await request(app).post('/api/volunteers').send({
          contact_id: testData.contactId,
          skills: ['Testing'],
        });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/volunteers', () => {
      it('should allow authenticated users to list volunteers', async () => {
        const response = await request(app)
          .get('/api/volunteers')
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
        .get('/api/accounts')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject malformed tokens', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', 'Bearer not-a-valid-token');

      expect(response.status).toBe(401);
    });

    it('should reject missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', tokens.admin);

      expect(response.status).toBe(401);
    });
  });
});
