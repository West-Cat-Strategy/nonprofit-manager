import type { Pool } from 'pg';
import { setCurrentUserId } from '@config/database';
import type {
  DonorProfile,
  DonorReceiptFrequency,
  UpdateDonorProfileDTO,
} from '@app-types/contact';

type DonorProfileRow = {
  id: string;
  contact_id: string;
  account_id: string | null;
  receipt_frequency: DonorReceiptFrequency;
  receipt_each_gift: boolean;
  email_gift_statement: boolean;
  anonymous_donor: boolean;
  no_solicitations: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
};

const defaultProfile = (contactId: string, accountId: string | null): DonorProfile => ({
  id: null,
  contact_id: contactId,
  account_id: accountId,
  receipt_frequency: 'per_gift',
  receipt_each_gift: true,
  email_gift_statement: false,
  anonymous_donor: false,
  no_solicitations: false,
  notes: null,
  created_at: null,
  updated_at: null,
  created_by: null,
  updated_by: null,
});

const mapRow = (row: DonorProfileRow): DonorProfile => ({
  id: row.id,
  contact_id: row.contact_id,
  account_id: row.account_id,
  receipt_frequency: row.receipt_frequency,
  receipt_each_gift: row.receipt_each_gift,
  email_gift_statement: row.email_gift_statement,
  anonymous_donor: row.anonymous_donor,
  no_solicitations: row.no_solicitations,
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at,
  created_by: row.created_by,
  updated_by: row.updated_by,
});

export class DonorProfileService {
  constructor(private readonly pool: Pool) {}

  async getProfile(contactId: string, accountId: string | null): Promise<DonorProfile> {
    const result = await this.pool.query<DonorProfileRow>(
      `SELECT id,
              contact_id,
              account_id,
              receipt_frequency,
              receipt_each_gift,
              email_gift_statement,
              anonymous_donor,
              no_solicitations,
              notes,
              created_at,
              updated_at,
              created_by,
              updated_by
       FROM donor_profiles
       WHERE contact_id = $1
       LIMIT 1`,
      [contactId]
    );

    return result.rows[0] ? mapRow(result.rows[0]) : defaultProfile(contactId, accountId);
  }

  async updateProfile(args: {
    contactId: string;
    accountId: string | null;
    userId: string;
    payload: UpdateDonorProfileDTO;
  }): Promise<DonorProfile> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await setCurrentUserId(client, args.userId, { local: true });

      const result = await client.query<DonorProfileRow>(
        `INSERT INTO donor_profiles (
           contact_id,
           account_id,
           receipt_frequency,
           receipt_each_gift,
           email_gift_statement,
           anonymous_donor,
           no_solicitations,
           notes,
           created_by,
           updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
         ON CONFLICT (contact_id)
         DO UPDATE SET
           account_id = EXCLUDED.account_id,
           receipt_frequency = EXCLUDED.receipt_frequency,
           receipt_each_gift = EXCLUDED.receipt_each_gift,
           email_gift_statement = EXCLUDED.email_gift_statement,
           anonymous_donor = EXCLUDED.anonymous_donor,
           no_solicitations = EXCLUDED.no_solicitations,
           notes = EXCLUDED.notes,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id,
                   contact_id,
                   account_id,
                   receipt_frequency,
                   receipt_each_gift,
                   email_gift_statement,
                   anonymous_donor,
                   no_solicitations,
                   notes,
                   created_at,
                   updated_at,
                   created_by,
                   updated_by`,
        [
          args.contactId,
          args.accountId,
          args.payload.receipt_frequency,
          args.payload.receipt_each_gift ?? true,
          args.payload.email_gift_statement ?? false,
          args.payload.anonymous_donor ?? false,
          args.payload.no_solicitations ?? false,
          args.payload.notes ?? null,
          args.userId,
        ]
      );

      await client.query('COMMIT');
      return mapRow(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
