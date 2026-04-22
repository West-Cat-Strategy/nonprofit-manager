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
  const extractPaginatedData = <T>(
    body: Record<string, unknown>
  ): { data: T[]; pagination: Record<string, unknown> } => {
    if (Array.isArray(body.data) && body.pagination) {
      return {
        data: body.data as T[],
        pagination: body.pagination as Record<string, unknown>,
      };
    }

    if (
      body.data &&
      typeof body.data === 'object' &&
      !Array.isArray(body.data) &&
      Array.isArray((body.data as { data?: unknown[] }).data) &&
      (body.data as { pagination?: Record<string, unknown> }).pagination
    ) {
      return body.data as { data: T[]; pagination: Record<string, unknown> };
    }

    throw new Error(`Unexpected paginated response shape: ${JSON.stringify(body)}`);
  };
  const extractTaskList = <T>(
    body: Record<string, unknown>
  ): { tasks: T[]; pagination: Record<string, unknown> } => {
    if (Array.isArray(body.tasks) && body.pagination) {
      return {
        tasks: body.tasks as T[],
        pagination: body.pagination as Record<string, unknown>,
      };
    }

    if (
      body.data &&
      typeof body.data === 'object' &&
      !Array.isArray(body.data) &&
      Array.isArray((body.data as { tasks?: unknown[] }).tasks) &&
      (body.data as { pagination?: Record<string, unknown> }).pagination
    ) {
      return body.data as { tasks: T[]; pagination: Record<string, unknown> };
    }

    throw new Error(`Unexpected task list response shape: ${JSON.stringify(body)}`);
  };
  const expectCanonicalUnauthorized = (response: request.Response): void => {
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'unauthorized',
        message: expect.any(String),
      },
    });
  };
  const seededAccountName = `Auth Test Organization ${unique()}`;
  const seededContactEmail = `auth-test-contact-${unique()}@example.com`;
  const seededEventName = `Admin Test Event ${unique()}`;
  const seededTaskSubject = `Admin Test Task ${unique()}`;
  const seededVolunteerSkill = `Skill-${unique()}`;
  const testRoles = ['admin', 'manager', 'staff', 'volunteer', 'viewer'] as const;
  const organizationAccessByRole: Record<(typeof testRoles)[number], 'admin' | 'editor' | 'viewer'> = {
    admin: 'admin',
    manager: 'editor',
    staff: 'editor',
    volunteer: 'viewer',
    viewer: 'viewer',
  };
  let defaultOrganizationId: string | null = null;
  const assignOnlyExplicitRole = async (userId: string, roleName: string): Promise<void> => {
    try {
      const roleResult = await pool.query<{ id: string }>('SELECT id FROM roles WHERE name = $1', [
        roleName,
      ]);
      if (roleResult.rows.length === 0) {
        return;
      }

      await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      await pool.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, roleResult.rows[0].id]
      );
    } catch {
      // Role tables may not exist yet - that's ok for basic auth tests
    }
  };

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

      await assignOnlyExplicitRole(testUser.id, testUser.role);
    }
  };

  const ensureTestOrganizationAccess = async (): Promise<void> => {
    if (!defaultOrganizationId) {
      return;
    }

    for (const role of testRoles) {
      const userId = userIds[role];
      if (!userId) {
        continue;
      }

      await pool.query(
        `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (user_id, account_id)
         DO UPDATE SET access_level = EXCLUDED.access_level,
                       granted_by = EXCLUDED.granted_by,
                       is_active = TRUE`,
        [userId, defaultOrganizationId, organizationAccessByRole[role], userIds.admin]
      );
    }
  };

  beforeAll(async () => {
    // Create test users with different roles
    const roles = [...testRoles];
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

      await assignOnlyExplicitRole(userIds[role], role);
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

    await ensureTestOrganizationAccess();

    // Create test data using admin user
    const accountResponse = await request(app)
      .post('/api/v2/accounts')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        account_name: seededAccountName,
        account_type: 'organization',
        category: 'donor',
      });

    const accountPayload = unwrap<{ account_id?: string; id?: string }>(accountResponse.body);
    if (accountPayload.account_id || accountPayload.id) {
      testData.accountId = accountPayload.account_id ?? accountPayload.id ?? '';
      testData.accountName = seededAccountName;
    }

    // Create a test contact
    const contactResponse = await request(app)
      .post('/api/v2/contacts')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        first_name: 'Auth',
        last_name: 'TestContact',
        email: seededContactEmail,
        account_id: testData.accountId,
      });

    const contactPayload = unwrap<{ contact_id?: string; id?: string }>(contactResponse.body);
    if (contactPayload.contact_id || contactPayload.id) {
      testData.contactId = contactPayload.contact_id ?? contactPayload.id ?? '';
      testData.contactEmail = seededContactEmail;
    }
  });

  beforeEach(async () => {
    await ensureTestUsersExist();
    await ensureTestOrganizationAccess();
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
      await pool.query('DELETE FROM user_account_access WHERE user_id = ANY($1::uuid[])', [testUserIds]);
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
            .query({ search: testData.accountName })
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
          const payload = extractPaginatedData<{ account_id?: string; id?: string; account_name: string }>(
            response.body as Record<string, unknown>
          );
          expect(payload.pagination).toMatchObject({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
          });
          expect(payload.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                account_name: testData.accountName,
              }),
            ])
          );
        }
      });

      it('should require authentication', async () => {
        const response = await request(app).get('/api/v2/accounts');
        expect(response.status).toBe(401);
        expectCanonicalUnauthorized(response);
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
        const accountName = `Admin Created Account ${unique()}`;
        const response = await request(app)
          .post('/api/v2/accounts')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            account_name: accountName,
            account_type: 'individual',
            category: 'donor',
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdAccount = unwrap<{ account_id?: string; id?: string; account_name?: string }>(
          response.body
        );
        const createdAccountId = createdAccount.account_id ?? createdAccount.id;
        expect(createdAccount.account_name).toBe(accountName);
        if (createdAccountId) {
          const persisted = await pool.query<{ account_name: string; created_by: string }>(
            'SELECT account_name, created_by FROM accounts WHERE id = $1',
            [createdAccountId]
          );
          expect(persisted.rows[0]).toMatchObject({
            account_name: accountName,
            created_by: userIds.admin,
          });
          await pool.query('DELETE FROM accounts WHERE id = $1', [createdAccountId]);
        }
      });

      it('should allow manager to create accounts', async () => {
        const accountName = `Manager Created Account ${unique()}`;
        const response = await request(app)
          .post('/api/v2/accounts')
          .set('Authorization', `Bearer ${tokens.manager}`)
          .send({
            account_name: accountName,
            account_type: 'individual',
            category: 'donor',
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdAccount = unwrap<{ account_id?: string; id?: string; account_name?: string }>(
          response.body
        );
        const createdAccountId = createdAccount.account_id ?? createdAccount.id;
        expect(createdAccount.account_name).toBe(accountName);
        if (createdAccountId) {
          const persisted = await pool.query<{ account_name: string; created_by: string }>(
            'SELECT account_name, created_by FROM accounts WHERE id = $1',
            [createdAccountId]
          );
          expect(persisted.rows[0]).toMatchObject({
            account_name: accountName,
            created_by: userIds.manager,
          });
          await pool.query('DELETE FROM accounts WHERE id = $1', [createdAccountId]);
        }
      });

      it('should allow staff to create accounts', async () => {
        const accountName = `Staff Created Account ${unique()}`;
        const response = await request(app)
          .post('/api/v2/accounts')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            account_name: accountName,
            account_type: 'individual',
            category: 'donor',
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdAccount = unwrap<{ account_id?: string; id?: string; account_name?: string }>(
          response.body
        );
        const createdAccountId = createdAccount.account_id ?? createdAccount.id;
        expect(createdAccount.account_name).toBe(accountName);
        if (createdAccountId) {
          const persisted = await pool.query<{ account_name: string; created_by: string }>(
            'SELECT account_name, created_by FROM accounts WHERE id = $1',
            [createdAccountId]
          );
          expect(persisted.rows[0]).toMatchObject({
            account_name: accountName,
            created_by: userIds.staff,
          });
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
        const payload = unwrap<{ account_name?: string }>(response.body);
        expect(payload.account_name).toBe('Updated by Manager');
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

        const createdAccount = unwrap<{ account_id?: string; id?: string }>(createResponse.body);
        const accountId = createdAccount.account_id ?? createdAccount.id;
        if (!accountId) return;

        const response = await request(app)
          .delete(`/api/v2/accounts/${accountId}`)
          .set('Authorization', `Bearer ${tokens.admin}`);

        expect(response.status).toBe(204);
        const persisted = await pool.query<{ is_active: boolean }>(
          'SELECT is_active FROM accounts WHERE id = $1',
          [accountId]
        );
        expect(persisted.rows[0]).toMatchObject({ is_active: false });
      });
    });
  });

  describe('Contact CRUD Authorization', () => {
    describe('GET /api/v2/contacts', () => {
      it('should allow authenticated users to list contacts', async () => {
        for (const role of ['admin', 'manager', 'staff']) {
          const response = await request(app)
            .get('/api/v2/contacts')
            .query({ search: testData.contactEmail })
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
          const payload = extractPaginatedData<{ contact_id?: string; id?: string; email?: string }>(
            response.body as Record<string, unknown>
          );
          expect(payload.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                contact_id: testData.contactId,
              }),
            ])
          );
        }
      });

      it('should require authentication', async () => {
        const response = await request(app).get('/api/v2/contacts');
        expect(response.status).toBe(401);
        expectCanonicalUnauthorized(response);
      });
    });

    describe('POST /api/v2/contacts', () => {
      it('should allow admin to create contacts', async () => {
        const email = `admin-contact-${unique()}@example.com`;
        const response = await request(app)
          .post('/api/v2/contacts')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            first_name: 'Admin',
            last_name: 'Contact',
            email,
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdContact = unwrap<{ contact_id?: string; id?: string; email?: string }>(
          response.body
        );
        const createdContactId = createdContact.contact_id ?? createdContact.id;
        expect(createdContactId).toEqual(expect.any(String));
        if (createdContactId) {
          const persisted = await pool.query<{ email: string }>(
            'SELECT email FROM contacts WHERE id = $1',
            [createdContactId]
          );
          expect(persisted.rows[0]).toMatchObject({ email });
          await pool.query('DELETE FROM contacts WHERE id = $1', [createdContactId]);
        }
      });

      it('should allow manager to create contacts', async () => {
        const email = `manager-contact-${unique()}@example.com`;
        const response = await request(app)
          .post('/api/v2/contacts')
          .set('Authorization', `Bearer ${tokens.manager}`)
          .send({
            first_name: 'Manager',
            last_name: 'Contact',
            email,
          });

        expect(response.status).toBe(201);

        const createdContact = unwrap<{ contact_id?: string; id?: string; email?: string }>(
          response.body
        );
        const createdContactId = createdContact.contact_id ?? createdContact.id;
        expect(createdContactId).toEqual(expect.any(String));
        if (createdContactId) {
          const persisted = await pool.query<{ email: string }>(
            'SELECT email FROM contacts WHERE id = $1',
            [createdContactId]
          );
          expect(persisted.rows[0]).toMatchObject({ email });
          await pool.query('DELETE FROM contacts WHERE id = $1', [createdContactId]);
        }
      });

      it('should allow staff to create contacts', async () => {
        const email = `staff-contact-${unique()}@example.com`;
        const response = await request(app)
          .post('/api/v2/contacts')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            first_name: 'Staff',
            last_name: 'Contact',
            email,
          });

        expect(response.status).toBe(201);

        // Clean up
        const createdContact = unwrap<{ contact_id?: string; id?: string; email?: string }>(
          response.body
        );
        const createdContactId = createdContact.contact_id ?? createdContact.id;
        expect(createdContactId).toEqual(expect.any(String));
        if (createdContactId) {
          const persisted = await pool.query<{ email: string }>(
            'SELECT email FROM contacts WHERE id = $1',
            [createdContactId]
          );
          expect(persisted.rows[0]).toMatchObject({ email });
          await pool.query('DELETE FROM contacts WHERE id = $1', [createdContactId]);
        }
      });

      it('should return a validation error when account_id is outside the active organization context', async () => {
        const accountResponse = await request(app)
          .post('/api/v2/accounts')
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send({
            account_name: `Authorization Contact Scope ${unique()}`,
            account_type: 'organization',
          })
          .expect(201);

        const createdAccount = unwrap<{ account_id?: string; id?: string }>(accountResponse.body);
        const secondaryAccountId = createdAccount.account_id ?? createdAccount.id ?? '';
        expect(secondaryAccountId).toEqual(expect.any(String));

        try {
          const response = await request(app)
            .post('/api/v2/contacts')
            .set('Authorization', `Bearer ${tokens.staff}`)
            .send({
              first_name: 'Scoped',
              last_name: 'Contact',
              email: `scoped-contact-${unique()}@example.com`,
              account_id: secondaryAccountId,
            });

          expect(response.status).toBe(400);
          expect(response.body).toMatchObject({
            success: false,
            error: {
              code: 'validation_error',
              message: 'Selected account is outside the current request scope',
            },
          });
        } finally {
          if (secondaryAccountId) {
            await pool.query('DELETE FROM contacts WHERE account_id = $1', [secondaryAccountId]);
            await pool.query('DELETE FROM user_account_access WHERE account_id = $1', [secondaryAccountId]);
            await pool.query('DELETE FROM accounts WHERE id = $1', [secondaryAccountId]);
          }
        }
      });

      it.each(['viewer', 'volunteer'] as const)('should forbid %s from creating contacts', async (role) => {
        const response = await request(app)
          .post('/api/v2/contacts')
          .set('Authorization', `Bearer ${tokens[role]}`)
          .send({
            first_name: role,
            last_name: 'Contact',
            email: `${role}-contact-${unique()}@example.com`,
          });

        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'forbidden',
            message: expect.any(String),
          },
        });
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
        const payload = unwrap<{ first_name?: string }>(response.body);
        expect(payload.first_name).toBe('UpdatedByAdmin');
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
        const donation = unwrap<{ donation_id?: string; id?: string; amount?: number; account_id?: string }>(
          response.body
        );
        testDonationId = donation.donation_id ?? donation.id ?? '';
        expect(Number(donation.amount)).toBe(100);
        expect(donation.account_id).toBe(testData.accountId);
        if (testDonationId) {
          const persisted = await pool.query<{ amount: number; account_id: string }>(
            'SELECT amount, account_id FROM donations WHERE id = $1',
            [testDonationId]
          );
          expect(Number(persisted.rows[0].amount)).toBe(100);
          expect(persisted.rows[0].account_id).toBe(testData.accountId);
        }
      });

      it('should require authentication', async () => {
        const response = await request(app).post('/api/v2/donations').send({
          account_id: testData.accountId,
          amount: 50.0,
          donation_date: '2024-01-15',
        });

        expect(response.status).toBe(401);
        expectCanonicalUnauthorized(response);
      });
    });

    describe('GET /api/v2/donations', () => {
      it('should allow authenticated users to list donations', async () => {
        const response = await request(app)
          .get('/api/v2/donations')
          .query({ account_id: testData.accountId })
          .set('Authorization', `Bearer ${tokens.admin}`);

        expect(response.status).toBe(200);
        const payload = extractPaginatedData<{ donation_id?: string; id?: string; account_id?: string }>(
          response.body as Record<string, unknown>
        );
        expect(payload.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              account_id: testData.accountId,
            }),
          ])
        );
        if (testDonationId) {
          expect(payload.data.map((donation) => donation.donation_id ?? donation.id)).toContain(
            testDonationId
          );
        }
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
            event_name: seededEventName,
            event_type: 'fundraiser',
            status: 'planned',
            start_date: '2024-06-01T10:00:00Z',
            end_date: '2024-06-01T14:00:00Z',
          });

        expect(response.status).toBe(201);
        const event = unwrap<{ event_id?: string; id?: string; event_name?: string; status?: string }>(
          response.body
        );
        testEventId = event.event_id ?? event.id ?? '';
        expect(event.event_name).toBe(seededEventName);
        expect(event.status).toBe('planned');
      });

      it('should require authentication', async () => {
        const response = await request(app).post('/api/v2/events').send({
          event_name: 'Unauthorized Event',
          event_type: 'meeting',
        });

        expect(response.status).toBe(401);
        expectCanonicalUnauthorized(response);
      });
    });

    describe('GET /api/v2/events', () => {
      it('should allow authenticated users to list events', async () => {
        for (const role of ['admin', 'manager', 'staff', 'volunteer']) {
          const response = await request(app)
            .get('/api/v2/events')
            .query({ search: seededEventName })
            .set('Authorization', `Bearer ${tokens[role]}`);

          expect(response.status).toBe(200);
          const payload = extractPaginatedData<{ event_id?: string; id?: string; event_name?: string }>(
            response.body as Record<string, unknown>
          );
          expect(payload.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                event_name: seededEventName,
              }),
            ])
          );
          if (testEventId) {
            expect(payload.data.map((event) => event.event_id ?? event.id)).toContain(testEventId);
          }
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
            subject: seededTaskSubject,
            priority: 'high',
          });

        expect(response.status).toBe(201);
        const task = unwrap<{ id?: string; subject?: string; priority?: string }>(response.body);
        testTaskId = task.id ?? '';
        expect(task.subject).toBe(seededTaskSubject);
        expect(task.priority).toBe('high');
      });

      it('should allow staff to create tasks', async () => {
        const subject = `Staff Test Task ${unique()}`;
        const response = await request(app)
          .post('/api/v2/tasks')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            subject,
            priority: 'normal',
          });

        expect(response.status).toBe(201);
        const task = unwrap<{ id?: string; subject?: string; priority?: string }>(response.body);
        expect(task.subject).toBe(subject);
        expect(task.priority).toBe('normal');

        // Clean up
        if (task.id) {
          await pool.query('DELETE FROM tasks WHERE id = $1', [task.id]);
        }
      });
    });

    describe('GET /api/v2/tasks', () => {
      it('should allow authenticated users to list tasks', async () => {
        const response = await request(app)
          .get('/api/v2/tasks')
          .query({ search: seededTaskSubject })
          .set('Authorization', `Bearer ${tokens.admin}`);

        expect(response.status).toBe(200);
        const payload = extractTaskList<{ id?: string; subject?: string }>(
          response.body as Record<string, unknown>
        );
        expect(payload.tasks).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              subject: seededTaskSubject,
            }),
          ])
        );
        if (testTaskId) {
          expect(payload.tasks.map((task) => task.id)).toContain(testTaskId);
        }
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
            skills: [seededVolunteerSkill, 'Organizing'],
            availability_status: 'available',
          });

        expect(response.status).toBe(201);
        const volunteer = unwrap<{ id?: string; contact_id?: string; skills?: string[] }>(
          response.body
        );
        testVolunteerId = volunteer.id ?? '';
        expect(volunteer.contact_id).toBe(testData.contactId);
        expect(volunteer.skills).toEqual(
          expect.arrayContaining([seededVolunteerSkill, 'Organizing'])
        );
      });

      it('should require authentication', async () => {
        const response = await request(app).post('/api/v2/volunteers').send({
          contact_id: testData.contactId,
          skills: ['Testing'],
        });

        expect(response.status).toBe(401);
        expectCanonicalUnauthorized(response);
      });
    });

    describe('GET /api/v2/volunteers', () => {
      it('should allow authenticated users to list volunteers', async () => {
        const response = await request(app)
          .get('/api/v2/volunteers')
          .query({ skills: seededVolunteerSkill })
          .set('Authorization', `Bearer ${tokens.admin}`);

        expect(response.status).toBe(200);
        const payload = extractPaginatedData<{ id?: string; contact_id?: string; skills?: string[] }>(
          response.body as Record<string, unknown>
        );
        expect(payload.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              contact_id: testData.contactId,
              skills: expect.arrayContaining([seededVolunteerSkill]),
            }),
          ])
        );
        if (testVolunteerId) {
          expect(payload.data.map((volunteer) => volunteer.id)).toContain(testVolunteerId);
        }
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
      expectCanonicalUnauthorized(response);
    });

    it('should reject malformed tokens', async () => {
      const response = await request(app)
        .get('/api/v2/accounts')
        .set('Authorization', 'Bearer not-a-valid-token');

      expect(response.status).toBe(401);
      expectCanonicalUnauthorized(response);
    });

    it('should reject missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/v2/accounts')
        .set('Authorization', tokens.admin);

      expect(response.status).toBe(401);
      expectCanonicalUnauthorized(response);
    });
  });
});
