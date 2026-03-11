import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

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
      const response = await request(app)
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
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user).not.toHaveProperty('password_hash');

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
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
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
      const legacyToken = jwt.sign(
        {
          id: user.id,
          email: testEmail,
          role: user.role,
        },
        getJwtSecret(),
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${legacyToken}`)
        .expect(200);

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
      for (let i = 0; i < 5; i++) {
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
