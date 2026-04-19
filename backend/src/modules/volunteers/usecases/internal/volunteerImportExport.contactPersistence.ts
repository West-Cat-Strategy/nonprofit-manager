import type { PoolClient } from 'pg';
import { encrypt } from '@utils/encryption';
import type { ParsedVolunteerImportRow } from '../volunteerImportExport.types';

export type VolunteerImportContactPersistence = {
  insertContact: typeof insertVolunteerImportContact;
  updateContact: typeof updateVolunteerImportContact;
  syncRoles: typeof syncVolunteerImportRoles;
};

export const insertVolunteerImportContact = async (
  client: PoolClient,
  payload: ParsedVolunteerImportRow,
  accountId: string | null,
  userId: string
): Promise<string> => {
  const result = await client.query<{ contact_id: string }>(
    `
      INSERT INTO contacts (
        account_id,
        first_name,
        preferred_name,
        last_name,
        middle_name,
        salutation,
        suffix,
        birth_date,
        gender,
        pronouns,
        phn_encrypted,
        email,
        phone,
        mobile_phone,
        address_line1,
        address_line2,
        city,
        state_province,
        postal_code,
        country,
        no_fixed_address,
        job_title,
        department,
        preferred_contact_method,
        do_not_email,
        do_not_phone,
        do_not_text,
        do_not_voicemail,
        notes,
        tags,
        is_active,
        created_by,
        modified_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, COALESCE($21, false), $22, $23, $24, COALESCE($25, false), COALESCE($26, false),
        COALESCE($27, false), COALESCE($28, false), $29, COALESCE($30, ARRAY[]::text[]), COALESCE($31, true), $32, $32
      )
      RETURNING id AS contact_id
    `,
    [
      accountId,
      payload.first_name,
      payload.preferred_name,
      payload.last_name,
      payload.middle_name,
      payload.salutation,
      payload.suffix,
      payload.birth_date,
      payload.gender,
      payload.pronouns,
      payload.phn ? encrypt(payload.phn) : null,
      payload.email,
      payload.phone,
      payload.mobile_phone,
      payload.address_line1,
      payload.address_line2,
      payload.city,
      payload.state_province,
      payload.postal_code,
      payload.country,
      payload.no_fixed_address,
      payload.job_title,
      payload.department,
      payload.preferred_contact_method,
      payload.do_not_email,
      payload.do_not_phone,
      payload.do_not_text,
      payload.do_not_voicemail,
      payload.notes,
      payload.tags,
      payload.is_active,
      userId,
    ]
  );

  return result.rows[0].contact_id;
};

export const updateVolunteerImportContact = async (
  client: PoolClient,
  contactId: string,
  payload: ParsedVolunteerImportRow,
  resolvedAccountId: string | null | undefined,
  userId: string
): Promise<void> => {
  const updates: string[] = [];
  const values: Array<string | boolean | string[] | Date | null> = [];
  let parameter = 1;

  const setField = (
    field: string,
    value: string | boolean | string[] | Date | null | undefined
  ): void => {
    if (value === undefined) {
      return;
    }

    updates.push(`${field} = $${parameter}`);
    values.push(value);
    parameter += 1;
  };

  if (resolvedAccountId !== undefined) {
    setField('account_id', resolvedAccountId);
  }

  setField('first_name', payload.first_name);
  setField('preferred_name', payload.preferred_name);
  setField('last_name', payload.last_name);
  setField('middle_name', payload.middle_name);
  setField('salutation', payload.salutation);
  setField('suffix', payload.suffix);
  if (payload.birth_date !== undefined) {
    updates.push(`birth_date = $${parameter}::date`);
    values.push(payload.birth_date as string | null);
    parameter += 1;
  }
  setField('gender', payload.gender);
  setField('pronouns', payload.pronouns);
  if (payload.phn !== undefined) {
    setField('phn_encrypted', payload.phn ? encrypt(payload.phn) : null);
  }
  setField('email', payload.email);
  setField('phone', payload.phone);
  setField('mobile_phone', payload.mobile_phone);
  setField('address_line1', payload.address_line1);
  setField('address_line2', payload.address_line2);
  setField('city', payload.city);
  setField('state_province', payload.state_province);
  setField('postal_code', payload.postal_code);
  setField('country', payload.country);
  setField('no_fixed_address', payload.no_fixed_address);
  setField('job_title', payload.job_title);
  setField('department', payload.department);
  setField('preferred_contact_method', payload.preferred_contact_method);
  setField('do_not_email', payload.do_not_email);
  setField('do_not_phone', payload.do_not_phone);
  setField('do_not_text', payload.do_not_text);
  setField('do_not_voicemail', payload.do_not_voicemail);
  setField('notes', payload.notes);
  setField('tags', payload.tags);
  setField('is_active', payload.is_active);

  if (updates.length === 0) {
    return;
  }

  updates.push(`modified_by = $${parameter}`);
  values.push(userId);
  parameter += 1;
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(contactId);

  await client.query(
    `
      UPDATE contacts
      SET ${updates.join(', ')}
      WHERE id = $${parameter}
    `,
    values
  );
};

export const syncVolunteerImportRoles = async (
  client: PoolClient,
  contactId: string,
  roles: string[],
  userId: string
): Promise<void> => {
  await client.query('DELETE FROM contact_role_assignments WHERE contact_id = $1', [contactId]);

  if (roles.length === 0) {
    return;
  }

  const roleResult = await client.query<{ id: string; name: string }>(
    'SELECT id, name FROM contact_roles WHERE name = ANY($1::text[])',
    [roles]
  );

  if (roleResult.rows.length !== roles.length) {
    const found = new Set(roleResult.rows.map((row) => row.name));
    const missing = roles.filter((role) => !found.has(role));
    throw new Error(`Unknown contact role(s): ${missing.join(', ')}`);
  }

  const insertValues: string[] = [];
  const params: string[] = [];
  roleResult.rows.forEach((role, index) => {
    const base = index * 3;
    insertValues.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    params.push(contactId, role.id, userId);
  });

  await client.query(
    `
      INSERT INTO contact_role_assignments (contact_id, role_id, assigned_by)
      VALUES ${insertValues.join(', ')}
    `,
    params
  );
};
