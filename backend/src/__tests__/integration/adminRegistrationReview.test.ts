import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import { issueAdminPendingRegistrationReviewToken } from '@utils/sessionTokens';

describe('Admin Registration Review API', () => {
  let reviewerId = '';
  const createdPendingRegistrationIds: string[] = [];

  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  beforeAll(async () => {
    const result = await pool.query<{ id: string }>(
      `SELECT id
         FROM users
        WHERE role = 'admin'
          AND COALESCE(is_active, true) = true
        ORDER BY created_at ASC
        LIMIT 1`
    );

    reviewerId = result.rows[0]?.id ?? '';
    if (!reviewerId) {
      throw new Error('Admin registration review integration test requires an active admin user.');
    }
  });

  afterEach(async () => {
    if (createdPendingRegistrationIds.length === 0) {
      return;
    }

    await pool.query('DELETE FROM pending_registrations WHERE id = ANY($1::uuid[])', [
      createdPendingRegistrationIds.splice(0, createdPendingRegistrationIds.length),
    ]);
  });

  it('previews a pending registration review token without leaking a server error', async () => {
    const pendingEmail = `admin-registration-review-${unique()}@example.com`;
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO pending_registrations (email, password_hash, first_name, last_name, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [pendingEmail, 'hashed-password', 'Dark', 'Mode Review']
    );
    const pendingRegistrationId = inserted.rows[0]?.id ?? '';

    if (!pendingRegistrationId) {
      throw new Error('Failed to seed pending registration for admin registration review test.');
    }

    createdPendingRegistrationIds.push(pendingRegistrationId);

    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId,
      adminUserId: reviewerId,
      action: 'approve',
    });

    const response = await request(app)
      .get(`/api/v2/auth/admin-registration-review/${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      action: 'approve',
      canConfirm: true,
      pendingRegistration: {
        id: pendingRegistrationId,
        email: pendingEmail,
        firstName: 'Dark',
        lastName: 'Mode Review',
        status: 'pending',
        hasStagedPasskeys: false,
      },
      currentReview: {
        status: 'pending',
        reviewedBy: null,
      },
    });
  });
});
