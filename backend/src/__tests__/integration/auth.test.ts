import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Auth API Integration Tests', () => {
  let authToken: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const testEmail = `auth-test-${unique()}@example.com`;
  const testPassword = 'StrongPassword123!';

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

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
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
        .post('/api/auth/register')
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
        .post('/api/auth/register')
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

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
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
        .post('/api/auth/login')
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
        .post('/api/auth/login')
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
        .post('/api/auth/login')
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

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(testEmail);
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should reject request with malformed Authorization header', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('GET /api/auth/check-access', () => {
    it('should require authentication', async () => {
      await request(app).get('/api/auth/check-access').expect(401);
    });

    it('should return authorization matrix for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/check-access')
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

  describe('Account Lockout', () => {
    it('should lock account after multiple failed login attempts', async () => {
      const lockoutEmail = `lockout-${unique()}@example.com`;

      // Register user for lockout testing
      await request(app).post('/api/auth/register').send({
        email: lockoutEmail,
        password: testPassword,
        password_confirm: testPassword,
        first_name: 'Lockout',
        last_name: 'Test',
      });

      // Make multiple failed login attempts sequentially
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send({
          email: lockoutEmail,
          password: 'WrongPassword',
        });
      }

      // Attempt login with correct password after lockout
      const response = await request(app).post('/api/auth/login').send({
        email: lockoutEmail,
        password: testPassword,
      });

      // Should be locked out even with correct password
      expect([401, 423]).toContain(response.status);
    }, 30000);
  });
});
