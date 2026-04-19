import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';
import { MAX_LOGIN_ATTEMPTS } from '../../middleware/accountLockout';

describe('Auth API Integration Tests', () => {
  let authToken: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const testEmail = `auth-test-${unique()}@example.com`;
  const testPassword = 'StrongPassword123!';
  const ensureDefaultOrganizationId = async (): Promise<string> => {
    const existing = await pool.query<{ id: string }>(
      `SELECT id
       FROM accounts
       WHERE account_type = 'organization'
         AND COALESCE(is_active, true) = true
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (existing.rows[0]?.id) {
      return existing.rows[0].id;
    }

    const userResult = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [testEmail]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      throw new Error('Test user must exist before creating a fallback organization');
    }

    const created = await pool.query<{ id: string }>(
      `INSERT INTO accounts (account_name, account_type, created_by, modified_by)
       VALUES ($1, 'organization', $2, $2)
       RETURNING id`,
      [`Auth Test Org ${unique()}`, userId]
    );

    return created.rows[0].id;
  };
  const withClearedOrganizationAccess = async <T>(
    userId: string,
    run: () => Promise<T>
  ): Promise<T> => {
    const existingAccess = await pool.query<{
      account_id: string;
      access_level: string;
      granted_by: string | null;
      is_active: boolean;
    }>(
      `SELECT
         account_id::text,
         access_level,
         granted_by::text,
         COALESCE(is_active, true) AS is_active
       FROM user_account_access
       WHERE user_id = $1`,
      [userId]
    );

    await pool.query('DELETE FROM user_account_access WHERE user_id = $1', [userId]);

    try {
      return await run();
    } finally {
      for (const row of existingAccess.rows) {
        await pool.query(
          `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, account_id)
           DO UPDATE SET access_level = EXCLUDED.access_level,
                         granted_by = EXCLUDED.granted_by,
                         is_active = EXCLUDED.is_active,
                         granted_at = CURRENT_TIMESTAMP`,
          [userId, row.account_id, row.access_level, row.granted_by, row.is_active]
        );
      }
    }
  };

  afterAll(async () => {
    const safeDelete = async (query: string, params: unknown[]) => {
      try {
        await pool.query(query, params);
      } catch {
        // Table may not exist - ignore
      }
    };

    // First, get all test user IDs
    const testUsers = await pool.query(
      "SELECT id FROM users WHERE email LIKE '%auth-test%' OR email LIKE '%hash-test%' OR email LIKE '%rate-limit%' OR email LIKE '%lockout%'"
    );
    const userIds = testUsers.rows.map((r: { id: string }) => r.id);

    if (userIds.length > 0) {
      // Clean up resources created by test users (respecting foreign key constraints)
      await safeDelete('DELETE FROM donations WHERE created_by = ANY($1)', [userIds]);
      await safeDelete('DELETE FROM tasks WHERE created_by = ANY($1)', [userIds]);
      await safeDelete('DELETE FROM volunteer_assignments WHERE created_by = ANY($1)', [userIds]);
      await safeDelete('DELETE FROM volunteers WHERE created_by = ANY($1)', [userIds]);
      await safeDelete('DELETE FROM event_registrations WHERE contact_id IN (SELECT id FROM contacts WHERE created_by = ANY($1))', [userIds]);
      await safeDelete('DELETE FROM contacts WHERE created_by = ANY($1)', [userIds]);
      await safeDelete('DELETE FROM events WHERE created_by = ANY($1)', [userIds]);
      await safeDelete('DELETE FROM accounts WHERE created_by = ANY($1)', [userIds]);
      await safeDelete('DELETE FROM user_roles WHERE user_id = ANY($1)', [userIds]);

      // Finally delete users
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    }
  });

  describe('POST /api/v2/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const agent = request.agent(app);
      const response = await agent
        .post('/api/v2/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          password_confirm: testPassword,
          first_name: 'Auth',
          last_name: 'Test',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('csrfToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user).not.toHaveProperty('password_hash');

      await agent
        .post('/api/v2/auth/logout')
        .set('X-CSRF-Token', response.body.csrfToken)
        .expect(200);

      authToken = response.body.token;
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          email: testEmail,
          password: 'AnotherPassword123!',
          password_confirm: 'AnotherPassword123!',
          first_name: 'Duplicate',
          last_name: 'User',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });

    it('should hash the password before storage', async () => {
      const newEmail = `hash-test-${unique()}@example.com`;
      await request(app)
        .post('/api/v2/auth/register')
        .send({
          email: newEmail,
          password: testPassword,
          password_confirm: testPassword,
          first_name: 'Hash',
          last_name: 'Test',
        })
        .expect(201);

      // Verify password is hashed in database
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        [newEmail]
      );

      expect(result.rows[0].password_hash).toBeDefined();
      expect(result.rows[0].password_hash).not.toBe(testPassword);
      expect(result.rows[0].password_hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });
  });

  describe('POST /api/v2/auth/login', () => {
    it('should login with correct credentials', async () => {
      const agent = request.agent(app);
      const response = await agent
        .post('/api/v2/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('csrfToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);

      await agent
        .post('/api/v2/auth/logout')
        .set('X-CSRF-Token', response.body.csrfToken)
        .expect(200);
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'unauthorized',
        },
      });
      expect(response.body.error.message).toMatch(/invalid.*credentials/i);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'unauthorized',
        },
      });
      expect(response.body.error.message).toMatch(/invalid.*credentials/i);
    });

    it('should return valid JWT token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const token = response.body.token;

      // JWT format: header.payload.signature
      expect(token.split('.')).toHaveLength(3);
    });

  });

  describe('GET /api/v2/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('organizationId');
      expect(response.body.email).toBe(testEmail);
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should backfill organizationId for legacy tokens without an org claim', async () => {
      const expectedOrganizationId = await ensureDefaultOrganizationId();
      const userResult = await pool.query<{ id: string; role: string }>(
        'SELECT id, role FROM users WHERE email = $1',
        [testEmail]
      );

      const user = userResult.rows[0];
      const response = await withClearedOrganizationAccess(user.id, async () => {
        const legacyToken = jwt.sign(
          {
            id: user.id,
            email: testEmail,
            role: user.role,
          },
          getJwtSecret(),
          { expiresIn: '1h' }
        );

        return request(app)
          .get('/api/v2/auth/me')
          .set('Authorization', `Bearer ${legacyToken}`)
          .expect(200);
      });

      expect(response.body.organizationId).toBe(expectedOrganizationId);
      expect(response.body.data.organizationId).toBe(expectedOrganizationId);
    });

    it('should reject request without token', async () => {
      await request(app).get('/api/v2/auth/me').expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should reject request with malformed Authorization header', async () => {
      await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('invalidates an existing token after a role change bumps auth revision', async () => {
      const email = `auth-role-revision-${unique()}@example.com`;
      const password = 'RoleRevision123!';

      const registerResponse = await request(app)
        .post('/api/v2/auth/register')
        .send({
          email,
          password,
          password_confirm: password,
          first_name: 'Role',
          last_name: 'Revision',
        })
        .expect(201);

      const currentToken = registerResponse.body.token;
      const userResult = await pool.query<{ id: string; auth_revision: number }>(
        'SELECT id, COALESCE(auth_revision, 0) AS auth_revision FROM users WHERE email = $1',
        [email]
      );
      const user = userResult.rows[0];

      await pool.query(
        `UPDATE users
         SET role = 'manager',
             auth_revision = COALESCE(auth_revision, 0) + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      );

      await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${currentToken}`)
        .expect(401);
    });

    it('invalidates an existing token after a password change bumps auth revision', async () => {
      const email = `auth-password-revision-${unique()}@example.com`;
      const password = 'PasswordRevision123!';

      const registerResponse = await request(app)
        .post('/api/v2/auth/register')
        .send({
          email,
          password,
          password_confirm: password,
          first_name: 'Password',
          last_name: 'Revision',
        })
        .expect(201);

      const currentToken = registerResponse.body.token;
      const userResult = await pool.query<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      const updatedPasswordHash = await bcrypt.hash('NewPasswordRevision123!', 10);

      await pool.query(
        `UPDATE users
         SET password_hash = $2,
             auth_revision = COALESCE(auth_revision, 0) + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [userResult.rows[0].id, updatedPasswordHash]
      );

      await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${currentToken}`)
        .expect(401);
    });
  });

  describe('GET /api/v2/auth/check-access', () => {
    it('should require authentication', async () => {
      await request(app).get('/api/v2/auth/check-access').expect(401);
    });

    it('should return authorization matrix for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v2/auth/check-access')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            primaryRole: expect.any(String),
            roles: expect.any(Array),
          },
          matrix: {
            staticPermissions: expect.any(Object),
            analyticsCapabilities: expect.any(Object),
            dbPermissions: expect.any(Object),
            fieldAccess: expect.any(Object),
          },
          generatedAt: expect.any(String),
          policyVersion: expect.any(String),
        },
      });
    });
  });

  describe('GET /api/v2/auth/bootstrap', () => {
    it('returns startup-scoped auth bootstrap data for authenticated requests', async () => {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS organization_branding (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          config JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )`
      );
      await pool.query(
        `INSERT INTO organization_branding (id, config)
         VALUES (1, $1::jsonb)
         ON CONFLICT (id)
         DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
        [
          JSON.stringify({
            appName: 'West Cat',
            appIcon: null,
            primaryColour: '#123456',
            secondaryColour: '#654321',
            favicon: null,
          }),
        ]
      );
      await pool.query(
        `UPDATE users
         SET preferences = $1::jsonb
         WHERE email = $2`,
        [
          JSON.stringify({
            timezone: 'America/Halifax',
            navigation: { items: [{ id: 'dashboard', enabled: true }] },
            dashboard_settings: { showQuickLookup: false },
            organization: { timezone: 'America/St_Johns', phoneFormat: 'canadian' },
            notifications: { weeklyDigest: true },
          }),
          testEmail,
        ]
      );

      const response = await request(app)
        .get('/api/v2/auth/bootstrap')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: testEmail,
          },
          organizationId: expect.any(String),
          branding: {
            appName: 'West Cat',
          },
          preferences: {
            timezone: 'America/St_Johns',
            navigation: {
              items: [{ id: 'dashboard', enabled: true }],
            },
            dashboard_settings: {
              showQuickLookup: false,
            },
          },
          workspaceModules: {
            contacts: true,
            accounts: true,
            volunteers: true,
            events: true,
            tasks: true,
            cases: true,
            followUps: true,
            opportunities: true,
            externalServiceProviders: true,
            teamChat: true,
            donations: true,
            recurringDonations: true,
            reconciliation: true,
            analytics: true,
            reports: true,
            scheduledReports: true,
            alerts: true,
          },
        },
      });
      expect(response.body.data.preferences).not.toHaveProperty('organization');
      expect(response.body.data.preferences).not.toHaveProperty('notifications');
    });

    it('backfills bootstrap organizationId for legacy tokens without active access rows', async () => {
      const expectedOrganizationId = await ensureDefaultOrganizationId();
      const userResult = await pool.query<{ id: string; role: string }>(
        'SELECT id, role FROM users WHERE email = $1',
        [testEmail]
      );

      const user = userResult.rows[0];
      const response = await withClearedOrganizationAccess(user.id, async () => {
        const legacyToken = jwt.sign(
          {
            id: user.id,
            email: testEmail,
            role: user.role,
          },
          getJwtSecret(),
          { expiresIn: '1h' }
        );

        return request(app)
          .get('/api/v2/auth/bootstrap')
          .set('Authorization', `Bearer ${legacyToken}`)
          .expect(200);
      });

      expect(response.body.data.organizationId).toBe(expectedOrganizationId);
    });

    it('requires authentication', async () => {
      await request(app).get('/api/v2/auth/bootstrap').expect(401);
    });

    it('rejects an explicit organization override when the user lacks access', async () => {
      const userResult = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [testEmail]);
      const userId = userResult.rows[0]?.id;
      expect(userId).toBeTruthy();

      const secondaryOrgResult = await pool.query<{ id: string }>(
        `INSERT INTO accounts (account_name, account_type, created_by, modified_by)
         VALUES ($1, 'organization', $2, $2)
         RETURNING id`,
        [`Unauthorized Org ${unique()}`, userId]
      );
      const secondaryOrgId = secondaryOrgResult.rows[0].id;

      try {
        const response = await request(app)
          .get('/api/v2/auth/bootstrap')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Organization-Id', secondaryOrgId)
          .expect(403);

        expect(response.body.error.code).toBe('forbidden');
        expect(response.body.error.message).toMatch(/do not have access/i);
      } finally {
        await pool.query('DELETE FROM accounts WHERE id = $1', [secondaryOrgId]);
      }
    });

    it('rejects unknown explicit organization overrides', async () => {
      const response = await request(app)
        .get('/api/v2/auth/bootstrap')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', '00000000-0000-4000-8000-000000000001')
        .expect(404);

      expect(response.body.error.code).toBe('not_found');
      expect(response.body.error.message).toMatch(/organization context not found/i);
    });

    it('rejects inactive explicit organization overrides', async () => {
      const userResult = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [testEmail]);
      const userId = userResult.rows[0]?.id;
      expect(userId).toBeTruthy();

      const inactiveOrgResult = await pool.query<{ id: string }>(
        `INSERT INTO accounts (account_name, account_type, created_by, modified_by, is_active)
         VALUES ($1, 'organization', $2, $2, FALSE)
         RETURNING id`,
        [`Inactive Org ${unique()}`, userId]
      );
      const inactiveOrgId = inactiveOrgResult.rows[0].id;

      try {
        const response = await request(app)
          .get('/api/v2/auth/bootstrap')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Organization-Id', inactiveOrgId)
          .expect(403);

        expect(response.body.error.code).toBe('forbidden');
        expect(response.body.error.message).toMatch(/inactive/i);
      } finally {
        await pool.query('DELETE FROM accounts WHERE id = $1', [inactiveOrgId]);
      }
    });
  });

  describe('PUT /api/v2/auth/profile', () => {
    const profilePicture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0w8AAAAASUVORK5CYII=';

    it('accepts camelCase profile updates and persists a base64 profile picture', async () => {
      const response = await request(app)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Profile',
          lastName: 'Updated',
          email: testEmail,
          displayName: 'Profile Display',
          alternativeName: 'Nickname',
          pronouns: 'they/them',
          title: 'Coordinator',
          cellPhone: '555-123-4567',
          contactNumber: '555-555-0000',
          profilePicture,
          emailSharedWithClients: true,
          emailSharedWithUsers: false,
          alternativeEmails: [
            {
              email: `alt-${unique()}@example.com`,
              label: 'Work',
              isVerified: true,
            },
          ],
          notifications: {
            emailNotifications: true,
            taskReminders: false,
            eventReminders: true,
            donationAlerts: false,
            caseUpdates: true,
            weeklyDigest: false,
            marketingEmails: false,
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          firstName: 'Profile',
          lastName: 'Updated',
          displayName: 'Profile Display',
          profilePicture,
          emailSharedWithClients: true,
          emailSharedWithUsers: false,
        },
      });
      expect(response.body.data.alternativeEmails).toHaveLength(1);
      expect(response.body.data.notifications.taskReminders).toBe(false);

      const stored = await pool.query<{ profile_picture: string | null }>(
        'SELECT profile_picture FROM users WHERE email = $1',
        [testEmail]
      );
      expect(stored.rows[0]?.profile_picture).toBe(profilePicture);
    });

    it('clears the stored profile picture when profilePicture is null', async () => {
      const response = await request(app)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profilePicture: null,
        })
        .expect(200);

      expect(response.body.data.profilePicture).toBeNull();

      const stored = await pool.query<{ profile_picture: string | null }>(
        'SELECT profile_picture FROM users WHERE email = $1',
        [testEmail]
      );
      expect(stored.rows[0]?.profile_picture).toBeNull();
    });

    it('rejects malformed notification payloads', async () => {
      const response = await request(app)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notifications: {
            emailNotifications: 'yes',
          },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('validation_error');
      expect(response.body.error.details.validation.body['notifications.emailNotifications']).toBeDefined();
    });

    it('rejects unknown profile fields via strict validation', async () => {
      const response = await request(app)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          unknownField: 'unexpected',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('validation_error');
    });

    it('rejects email updates that would collide with another user', async () => {
      const duplicateEmail = `duplicate-profile-${unique()}@example.com`;
      await request(app)
        .post('/api/v2/auth/register')
        .send({
          email: duplicateEmail,
          password: testPassword,
          password_confirm: testPassword,
          first_name: 'Duplicate',
          last_name: 'Profile',
        })
        .expect(201);

      const response = await request(app)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: duplicateEmail,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toMatch(/already in use/i);
    });
  });

  describe('Account Lockout', () => {
    const previousLockoutFlag = process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST;

    beforeAll(() => {
      process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = 'true';
    });

    afterAll(() => {
      if (previousLockoutFlag === undefined) {
        delete process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST;
        return;
      }

      process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = previousLockoutFlag;
    });

    it('should lock account after multiple failed login attempts', async () => {
      const lockoutEmail = `lockout-${unique()}@example.com`;

      // Register user for lockout testing
      await request(app).post('/api/v2/auth/register').send({
        email: lockoutEmail,
        password: testPassword,
        password_confirm: testPassword,
        first_name: 'Lockout',
        last_name: 'Test',
      });

      // Make multiple failed login attempts sequentially
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
        await request(app).post('/api/v2/auth/login').send({
          email: lockoutEmail,
          password: 'WrongPassword',
        });
      }

      // Attempt login with correct password after lockout
      const response = await request(app).post('/api/v2/auth/login').send({
        email: lockoutEmail,
        password: testPassword,
      });

      // Should be locked out even with correct password
      expect([401, 423]).toContain(response.status);
    }, 30000);
  });
});
