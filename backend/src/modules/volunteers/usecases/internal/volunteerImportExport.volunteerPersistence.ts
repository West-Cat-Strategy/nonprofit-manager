import type { PoolClient } from 'pg';
import type { ParsedVolunteerImportRow } from '../volunteerImportExport.types';

export type VolunteerImportVolunteerPersistence = {
  insertVolunteer: typeof insertImportedVolunteer;
  updateVolunteer: typeof updateImportedVolunteer;
};

export const insertImportedVolunteer = async (
  client: PoolClient,
  contactId: string,
  payload: ParsedVolunteerImportRow,
  userId: string
): Promise<string> => {
  const availabilityStatus = payload.availability_status ?? 'available';

  const result = await client.query<{ volunteer_id: string }>(
    `
      INSERT INTO volunteers (
        contact_id,
        volunteer_status,
        skills,
        availability,
        emergency_contact_name,
        emergency_contact_phone,
        background_check_date,
        background_check_status,
        hours_contributed,
        availability_status,
        availability_notes,
        background_check_expiry,
        preferred_roles,
        certifications,
        max_hours_per_week,
        emergency_contact_relationship,
        volunteer_since,
        total_hours_logged,
        is_active,
        created_by,
        modified_by
      ) VALUES (
        $1, $2, COALESCE($3, ARRAY[]::text[]), $4, $5, $6, $7::date, $8, COALESCE($9, 0),
        $10, $11, $12::date, COALESCE($13, ARRAY[]::text[]), COALESCE($14, ARRAY[]::text[]),
        $15, $16, CURRENT_DATE, COALESCE($9, 0), COALESCE($17, true), $18, $18
      )
      RETURNING id AS volunteer_id
    `,
    [
      contactId,
      availabilityStatus,
      payload.skills,
      payload.availability_notes,
      payload.emergency_contact_name,
      payload.emergency_contact_phone,
      payload.background_check_date,
      payload.background_check_status,
      0,
      availabilityStatus,
      payload.availability_notes,
      payload.background_check_expiry,
      payload.preferred_roles,
      payload.certifications,
      payload.max_hours_per_week,
      payload.emergency_contact_relationship,
      payload.is_active,
      userId,
    ]
  );

  return result.rows[0].volunteer_id;
};

export const updateImportedVolunteer = async (
  client: PoolClient,
  volunteerId: string,
  payload: ParsedVolunteerImportRow,
  userId: string
): Promise<void> => {
  const updates: string[] = [];
  const values: Array<string | boolean | string[] | number | Date | null> = [];
  let parameter = 1;

  const setField = (
    field: string,
    value: string | boolean | string[] | number | Date | null | undefined
  ): void => {
    if (value === undefined) {
      return;
    }

    updates.push(`${field} = $${parameter}`);
    values.push(value);
    parameter += 1;
  };

  if (payload.availability_status !== undefined) {
    setField('volunteer_status', payload.availability_status);
    setField('availability_status', payload.availability_status);
  }
  setField('skills', payload.skills);
  setField('availability', payload.availability_notes);
  setField('availability_notes', payload.availability_notes);
  if (payload.background_check_date !== undefined) {
    updates.push(`background_check_date = $${parameter}::date`);
    values.push(payload.background_check_date as string | null);
    parameter += 1;
  }
  setField('background_check_status', payload.background_check_status);
  if (payload.background_check_expiry !== undefined) {
    updates.push(`background_check_expiry = $${parameter}::date`);
    values.push(payload.background_check_expiry as string | null);
    parameter += 1;
  }
  setField('preferred_roles', payload.preferred_roles);
  setField('certifications', payload.certifications);
  setField('max_hours_per_week', payload.max_hours_per_week);
  setField('emergency_contact_name', payload.emergency_contact_name);
  setField('emergency_contact_phone', payload.emergency_contact_phone);
  setField('emergency_contact_relationship', payload.emergency_contact_relationship);
  setField('is_active', payload.is_active);

  if (updates.length === 0) {
    return;
  }

  updates.push(`modified_by = $${parameter}`);
  values.push(userId);
  parameter += 1;
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(volunteerId);

  await client.query(
    `
      UPDATE volunteers
      SET ${updates.join(', ')}
      WHERE id = $${parameter}
    `,
    values
  );
};
