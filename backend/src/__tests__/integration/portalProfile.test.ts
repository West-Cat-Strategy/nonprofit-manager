import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

type PortalProfileFixture = {
  staleContactId: string;
  linkedContactId: string;
  portalUserId: string;
  token: string;
};

const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createFixture = async (): Promise<PortalProfileFixture> => {
  const suffix = unique();
  const email = `portal-profile-${suffix}@example.com`;

  const staleContactResult = await pool.query(
    `INSERT INTO contacts (first_name, last_name, email, city, created_by, modified_by)
     VALUES ($1, $2, $3, $4, NULL, NULL)
     RETURNING id`,
    ['Stale', 'Contact', `stale-${email}`, 'Old Town']
  );
  const staleContactId = staleContactResult.rows[0].id as string;

  const linkedContactResult = await pool.query(
    `INSERT INTO contacts (first_name, last_name, email, city, created_by, modified_by)
     VALUES ($1, $2, $3, $4, NULL, NULL)
     RETURNING id`,
    ['Current', 'Contact', `current-${email}`, 'Live City']
  );
  const linkedContactId = linkedContactResult.rows[0].id as string;

  const portalUserResult = await pool.query(
    `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
     VALUES ($1, $2, $3, 'active', true)
     RETURNING id`,
    [staleContactId, email, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
  );
  const portalUserId = portalUserResult.rows[0].id as string;

  await pool.query('UPDATE portal_users SET contact_id = $1 WHERE id = $2', [
    linkedContactId,
    portalUserId,
  ]);

  const token = jwt.sign(
    {
      id: portalUserId,
      email,
      contactId: staleContactId,
      type: 'portal' as const,
    },
    getJwtSecret(),
    { expiresIn: '1h' }
  );

  return {
    staleContactId,
    linkedContactId,
    portalUserId,
    token,
  };
};

const destroyFixture = async (fixture: PortalProfileFixture): Promise<void> => {
  await pool.query('DELETE FROM portal_users WHERE id = $1', [fixture.portalUserId]);
  await pool.query('DELETE FROM contacts WHERE id = ANY($1)', [[fixture.staleContactId, fixture.linkedContactId]]);
};

describe('Portal Profile Integration', () => {
  it('reads the profile for the current portal actor linkage instead of the stale token contact id', async () => {
    const fixture = await createFixture();

    try {
      const response = await request(app)
        .get('/api/v2/portal/profile')
        .set('Cookie', [`portal_auth_token=${fixture.token}`])
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          contact_id: fixture.linkedContactId,
          first_name: 'Current',
          city: 'Live City',
        },
      });
    } finally {
      await destroyFixture(fixture);
    }
  });

  it('updates only the currently linked contact for portal profile writes', async () => {
    const fixture = await createFixture();

    try {
      const response = await request(app)
        .patch('/api/v2/portal/profile')
        .set('Cookie', [`portal_auth_token=${fixture.token}`])
        .send({
          first_name: 'Updated Current',
          city: 'Victoria',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          contact_id: fixture.linkedContactId,
          first_name: 'Updated Current',
          city: 'Victoria',
        },
      });

      const contacts = await pool.query<{
        id: string;
        first_name: string | null;
        city: string | null;
      }>(
        `SELECT id, first_name, city
         FROM contacts
         WHERE id = ANY($1)
         ORDER BY id`,
        [[fixture.staleContactId, fixture.linkedContactId]]
      );

      expect(contacts.rows).toEqual(
        expect.arrayContaining([
          {
            id: fixture.staleContactId,
            first_name: 'Stale',
            city: 'Old Town',
          },
          {
            id: fixture.linkedContactId,
            first_name: 'Updated Current',
            city: 'Victoria',
          },
        ])
      );
    } finally {
      await destroyFixture(fixture);
    }
  });
});
