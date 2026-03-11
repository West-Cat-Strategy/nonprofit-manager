import pool from '@config/database';

type QueryResultRow = Record<string, unknown>;
type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount?: number | null }>;
};

type ContactMethodSummaryInput = {
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
};

const trimToNull = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return value ?? null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getEmailRepresentative = async (
  contactId: string,
  email: string | null,
  db: Queryable
): Promise<QueryResultRow | null> => {
  const result = await db.query(
    `
      SELECT id, email_address, is_primary
      FROM contact_email_addresses
      WHERE contact_id = $1
      ORDER BY
        CASE WHEN $2::text IS NOT NULL AND LOWER(email_address) = LOWER($2::text) THEN 0 ELSE 1 END,
        is_primary DESC,
        created_at ASC,
        id ASC
      LIMIT 1
    `,
    [contactId, email]
  );

  return result.rows[0] || null;
};

const syncStructuredEmailFromSummary = async (
  contactId: string,
  email: string | null,
  userId: string,
  db: Queryable
): Promise<void> => {
  const normalizedEmail = trimToNull(email)?.toLowerCase() ?? null;
  const representative = await getEmailRepresentative(contactId, normalizedEmail, db);

  if (!normalizedEmail) {
    if (representative) {
      await db.query('DELETE FROM contact_email_addresses WHERE id = $1', [representative.id]);
    }
    return;
  }

  if (representative) {
    const currentEmail = typeof representative.email_address === 'string'
      ? representative.email_address.toLowerCase()
      : null;
    if (currentEmail === normalizedEmail) {
      await db.query(
        `
          UPDATE contact_email_addresses
          SET label = 'personal',
              is_primary = true,
              modified_by = $2
          WHERE id = $1
        `,
        [representative.id, userId]
      );
      return;
    }

    await db.query(
      `
        UPDATE contact_email_addresses
        SET email_address = $2,
            label = 'personal',
            is_primary = true,
            modified_by = $3
        WHERE id = $1
      `,
      [representative.id, normalizedEmail, userId]
    );
    return;
  }

  await db.query(
    `
      INSERT INTO contact_email_addresses (
        contact_id,
        email_address,
        label,
        is_primary,
        created_by,
        modified_by
      ) VALUES ($1, $2, 'personal', true, $3, $3)
    `,
    [contactId, normalizedEmail, userId]
  );
};

const getPhoneRepresentative = async (
  contactId: string,
  slot: 'phone' | 'mobile_phone',
  phoneNumber: string | null,
  db: Queryable
): Promise<QueryResultRow | null> => {
  const labelCondition = slot === 'mobile_phone' ? `label = 'mobile'` : `label <> 'mobile'`;
  const result = await db.query(
    `
      SELECT id, phone_number, label, is_primary
      FROM contact_phone_numbers
      WHERE contact_id = $1
        AND ${labelCondition}
      ORDER BY
        CASE WHEN $2::text IS NOT NULL AND phone_number = $2::text THEN 0 ELSE 1 END,
        is_primary DESC,
        created_at ASC,
        id ASC
      LIMIT 1
    `,
    [contactId, phoneNumber]
  );

  return result.rows[0] || null;
};

const syncStructuredPhoneFromSummary = async (
  contactId: string,
  slot: 'phone' | 'mobile_phone',
  phoneNumber: string | null,
  userId: string,
  db: Queryable
): Promise<void> => {
  const normalizedPhone = trimToNull(phoneNumber);
  const targetLabel = slot === 'mobile_phone' ? 'mobile' : 'other';
  const representative = await getPhoneRepresentative(contactId, slot, normalizedPhone, db);

  if (!normalizedPhone) {
    if (representative) {
      await db.query('DELETE FROM contact_phone_numbers WHERE id = $1', [representative.id]);
    }
    return;
  }

  if (representative) {
    if (representative.phone_number === normalizedPhone && representative.label === targetLabel) {
      await db.query(
        `
          UPDATE contact_phone_numbers
          SET label = $2,
              is_primary = true,
              modified_by = $3
          WHERE id = $1
        `,
        [representative.id, targetLabel, userId]
      );
      return;
    }

    await db.query(
      `
        UPDATE contact_phone_numbers
        SET phone_number = $2,
            label = $3,
            is_primary = true,
            modified_by = $4
        WHERE id = $1
      `,
      [representative.id, normalizedPhone, targetLabel, userId]
    );
    return;
  }

  const counts = await db.query(
    `
      SELECT
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE label <> 'mobile')::int AS non_mobile_count
      FROM contact_phone_numbers
      WHERE contact_id = $1
    `,
    [contactId]
  );
  const countRow = counts.rows[0] || { total_count: 0, non_mobile_count: 0 };
  const totalCount = Number(countRow.total_count ?? 0);
  const nonMobileCount = Number(countRow.non_mobile_count ?? 0);
  const shouldBePrimary =
    totalCount === 0 ||
    (slot === 'phone' && nonMobileCount === 0) ||
    (slot === 'mobile_phone' && nonMobileCount === 0);

  await db.query(
    `
      INSERT INTO contact_phone_numbers (
        contact_id,
        phone_number,
        label,
        is_primary,
        created_by,
        modified_by
      ) VALUES ($1, $2, $3, $4, $5, $5)
    `,
    [contactId, normalizedPhone, targetLabel, shouldBePrimary, userId]
  );
};

export async function syncStructuredContactMethodsFromSummary(
  contactId: string,
  summary: ContactMethodSummaryInput,
  userId: string,
  db: Queryable = pool
): Promise<void> {
  if (summary.email !== undefined) {
    await syncStructuredEmailFromSummary(contactId, summary.email, userId, db);
  }
  if (summary.phone !== undefined) {
    await syncStructuredPhoneFromSummary(contactId, 'phone', summary.phone, userId, db);
  }
  if (summary.mobile_phone !== undefined) {
    await syncStructuredPhoneFromSummary(contactId, 'mobile_phone', summary.mobile_phone, userId, db);
  }
}

export async function syncContactMethodSummaries(
  contactId: string,
  db: Queryable = pool
): Promise<void> {
  await db.query(
    `
      UPDATE contacts AS c
      SET email = (
            SELECT ce.email_address
            FROM contact_email_addresses AS ce
            WHERE ce.contact_id = c.id
            ORDER BY ce.is_primary DESC, ce.created_at ASC, ce.id ASC
            LIMIT 1
          ),
          phone = (
            SELECT cp.phone_number
            FROM contact_phone_numbers AS cp
            WHERE cp.contact_id = c.id
              AND cp.label <> 'mobile'
            ORDER BY cp.is_primary DESC, cp.created_at ASC, cp.id ASC
            LIMIT 1
          ),
          mobile_phone = (
            SELECT cp.phone_number
            FROM contact_phone_numbers AS cp
            WHERE cp.contact_id = c.id
              AND cp.label = 'mobile'
            ORDER BY cp.is_primary DESC, cp.created_at ASC, cp.id ASC
            LIMIT 1
          ),
          updated_at = CURRENT_TIMESTAMP
      WHERE c.id = $1
    `,
    [contactId]
  );
}
