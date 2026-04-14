import { PoolClient } from 'pg';
import {
  chooseNonOtherLabel,
  type MergeEmailRow,
  type MergePhoneRow,
  normalizeEmailValue,
  normalizePhoneMatchKey,
  normalizePhoneValue,
  setContactMethodPrimary,
} from './contactMergeHelpers';

interface MergeContactMethodsInput {
  client: PoolClient;
  sourceContactId: string;
  targetContactId: string;
  userId: string;
  selectedEmail: string | null;
  selectedPhone: string | null;
  selectedMobilePhone: string | null;
  incrementCount: (key: string, amount: number) => void;
}

export const mergeContactMethods = async ({
  client,
  sourceContactId,
  targetContactId,
  userId,
  selectedEmail,
  selectedPhone,
  selectedMobilePhone,
  incrementCount,
}: MergeContactMethodsInput): Promise<void> => {
  const phoneRows = await client.query<MergePhoneRow>(
    `SELECT id, contact_id, phone_number, label, is_primary, created_at, modified_by
     FROM contact_phone_numbers
     WHERE contact_id = ANY($1::uuid[])
     ORDER BY created_at ASC, id ASC
     FOR UPDATE`,
    [[sourceContactId, targetContactId]]
  );

  const emailRows = await client.query<MergeEmailRow>(
    `SELECT id, contact_id, email_address, label, is_primary, created_at, modified_by
     FROM contact_email_addresses
     WHERE contact_id = ANY($1::uuid[])
     ORDER BY created_at ASC, id ASC
     FOR UPDATE`,
    [[sourceContactId, targetContactId]]
  );

  const targetPhoneRows = phoneRows.rows.filter((row) => row.contact_id === targetContactId);
  const targetEmailRows = emailRows.rows.filter((row) => row.contact_id === targetContactId);

  const phoneByNumber = new Map<string, MergePhoneRow>();
  targetPhoneRows.forEach((row) => {
    phoneByNumber.set(
      normalizePhoneMatchKey(row.phone_number) ?? normalizePhoneValue(row.phone_number) ?? row.phone_number,
      row
    );
  });

  const emailByAddress = new Map<string, MergeEmailRow>();
  targetEmailRows.forEach((row) => {
    emailByAddress.set(normalizeEmailValue(row.email_address) ?? row.email_address, row);
  });

  for (const row of phoneRows.rows.filter((value) => value.contact_id === sourceContactId)) {
    const key = normalizePhoneMatchKey(row.phone_number) ?? normalizePhoneValue(row.phone_number) ?? row.phone_number;
    const existing = phoneByNumber.get(key);
    if (existing) {
      const updatedLabel = chooseNonOtherLabel(existing.label, row.label) ?? existing.label;
      const updatedPrimary = existing.is_primary || row.is_primary;
      await client.query(
        `UPDATE contact_phone_numbers
         SET phone_number = $2,
             label = $3,
             is_primary = $4,
             modified_by = $5
         WHERE id = $1`,
        [existing.id, row.phone_number, updatedLabel, updatedPrimary, userId]
      );
      await client.query('DELETE FROM contact_phone_numbers WHERE id = $1', [row.id]);
      incrementCount('contact_phone_numbers', 1);
      continue;
    }

    await client.query(
      `UPDATE contact_phone_numbers
       SET contact_id = $2,
           is_primary = $3,
           modified_by = $4
         WHERE id = $1`,
      [row.id, targetContactId, false, userId]
    );
    phoneByNumber.set(key, { ...row, contact_id: targetContactId, is_primary: false });
    incrementCount('contact_phone_numbers', 1);
  }

  for (const row of emailRows.rows.filter((value) => value.contact_id === sourceContactId)) {
    const key = normalizeEmailValue(row.email_address) ?? row.email_address;
    const existing = emailByAddress.get(key);
    if (existing) {
      const updatedLabel = chooseNonOtherLabel(existing.label, row.label) ?? existing.label;
      const updatedPrimary = existing.is_primary || row.is_primary;
      await client.query(
        `UPDATE contact_email_addresses
         SET email_address = $2,
             label = $3,
             is_primary = $4,
             modified_by = $5
         WHERE id = $1`,
        [existing.id, row.email_address, updatedLabel, updatedPrimary, userId]
      );
      await client.query('DELETE FROM contact_email_addresses WHERE id = $1', [row.id]);
      incrementCount('contact_email_addresses', 1);
      continue;
    }

    await client.query(
      `UPDATE contact_email_addresses
       SET contact_id = $2,
           is_primary = false,
           modified_by = $3
       WHERE id = $1`,
      [row.id, targetContactId, userId]
    );
    emailByAddress.set(key, { ...row, contact_id: targetContactId, is_primary: false });
    incrementCount('contact_email_addresses', 1);
  }

  const resolveSummaryPhone = async (
    slot: 'phone' | 'mobile_phone',
    value: string | null
  ): Promise<void> => {
    if (!value) {
      return;
    }

    const desiredLabel = slot === 'mobile_phone' ? 'mobile' : 'other';
    const matchKey = normalizePhoneMatchKey(value);
    const existingRow = await client.query<MergePhoneRow>(
      `SELECT id, contact_id, phone_number, label, is_primary, created_at, modified_by
       FROM contact_phone_numbers
       WHERE contact_id = $1
         AND regexp_replace(phone_number, '\\D', '', 'g') = $2
       ORDER BY is_primary DESC, created_at ASC, id ASC
       LIMIT 1`,
      [targetContactId, matchKey]
    );

    if (existingRow.rows[0]) {
      const updatedLabel =
        chooseNonOtherLabel(existingRow.rows[0].label, desiredLabel) ?? existingRow.rows[0].label;
      await client.query(
        `UPDATE contact_phone_numbers
         SET phone_number = $2,
             label = $3,
             is_primary = true,
             modified_by = $4
         WHERE id = $1`,
        [existingRow.rows[0].id, value, updatedLabel, userId]
      );
      await setContactMethodPrimary(
        client,
        targetContactId,
        existingRow.rows[0].id,
        'contact_phone_numbers',
        slot === 'mobile_phone' ? "label = 'mobile'" : "label <> 'mobile'"
      );
      return;
    }

    const created = await client.query<{ id: string }>(
      `INSERT INTO contact_phone_numbers (
         contact_id,
         phone_number,
         label,
         is_primary,
         created_by,
         modified_by
       ) VALUES ($1, $2, $3, true, $4, $4)
       RETURNING id`,
      [targetContactId, value, desiredLabel, userId]
    );

    if (created.rows[0]?.id) {
      await setContactMethodPrimary(
        client,
        targetContactId,
        created.rows[0].id,
        'contact_phone_numbers',
        slot === 'mobile_phone' ? "label = 'mobile'" : "label <> 'mobile'"
      );
    }
  };

  const resolveSummaryEmail = async (value: string | null): Promise<void> => {
    if (!value) {
      return;
    }

    const existingRow = await client.query<MergeEmailRow>(
      `SELECT id, contact_id, email_address, label, is_primary, created_at, modified_by
       FROM contact_email_addresses
       WHERE contact_id = $1
         AND lower(email_address) = lower($2)
       ORDER BY is_primary DESC, created_at ASC, id ASC
       LIMIT 1`,
      [targetContactId, value]
    );

    if (existingRow.rows[0]) {
      await client.query(
        `UPDATE contact_email_addresses
         SET email_address = $2,
             label = 'personal',
             is_primary = true,
             modified_by = $3
         WHERE id = $1`,
        [existingRow.rows[0].id, value, userId]
      );
      await setContactMethodPrimary(
        client,
        targetContactId,
        existingRow.rows[0].id,
        'contact_email_addresses'
      );
      return;
    }

    const created = await client.query<{ id: string }>(
      `INSERT INTO contact_email_addresses (
         contact_id,
         email_address,
         label,
         is_primary,
         created_by,
         modified_by
       ) VALUES ($1, $2, 'personal', true, $3, $3)
       RETURNING id`,
      [targetContactId, value, userId]
    );

    if (created.rows[0]?.id) {
      await setContactMethodPrimary(client, targetContactId, created.rows[0].id, 'contact_email_addresses');
    }
  };

  await resolveSummaryEmail(selectedEmail);
  await resolveSummaryPhone('phone', selectedPhone);
  await resolveSummaryPhone('mobile_phone', selectedMobilePhone);
};
