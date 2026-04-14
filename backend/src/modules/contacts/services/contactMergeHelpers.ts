import { PoolClient } from 'pg';
import type { Contact } from '@app-types/contact';
import {
  mapContactRow,
  normalizeDateOnly,
  type ContactRecord,
  type ViewerRole,
} from '@services/contactServiceHelpers';

export type MergeScalarValue = string | number | boolean | string[] | null;

export type MergePhoneRow = {
  id: string;
  contact_id: string;
  phone_number: string;
  label: string;
  is_primary: boolean;
  created_at: Date;
  modified_by: string | null;
};

export type MergeEmailRow = {
  id: string;
  contact_id: string;
  email_address: string;
  label: string;
  is_primary: boolean;
  created_at: Date;
  modified_by: string | null;
};

export type MergeRelationshipRow = {
  id: string;
  contact_id: string;
  related_contact_id: string;
  relationship_type: string;
  relationship_label: string | null;
  is_bidirectional: boolean;
  inverse_relationship_type: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
};

export type MergeVolunteerRow = {
  id: string;
  contact_id: string;
  volunteer_status: string | null;
  skills: string[] | null;
  availability: string | null;
  availability_status: string | null;
  availability_notes: string | null;
  background_check_status: string | null;
  background_check_date: string | Date | null;
  background_check_expiry: string | Date | null;
  preferred_roles: string[] | null;
  certifications: string[] | null;
  max_hours_per_week: string | number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  is_active: boolean | null;
  volunteer_since: string | Date | null;
  total_hours_logged: string | number | null;
  hours_contributed: string | number | null;
};

type Queryable = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: T[]; rowCount?: number | null }>;
};

export const CONTACT_BY_ID_SQL = `
  SELECT
    c.id as contact_id,
    c.account_id,
    c.first_name,
    c.preferred_name,
    c.last_name,
    c.middle_name,
    c.salutation,
    c.suffix,
    c.birth_date,
    c.gender,
    c.pronouns,
    c.phn_encrypted,
    c.email,
    c.phone,
    c.mobile_phone,
    c.job_title,
    c.department,
    c.preferred_contact_method,
    c.do_not_email,
    c.do_not_phone,
    c.do_not_text,
    c.do_not_voicemail,
    c.address_line1,
    c.address_line2,
    c.city,
    c.state_province,
    c.postal_code,
    c.country,
    c.no_fixed_address,
    c.notes,
    c.document_count,
    c.tags,
    c.is_active,
    c.created_at,
    c.updated_at,
    a.account_name,
    (SELECT COUNT(*)::int FROM contact_phone_numbers WHERE contact_id = c.id) as phone_count,
    (SELECT COUNT(*)::int FROM contact_email_addresses WHERE contact_id = c.id) as email_count,
    (SELECT COUNT(*)::int FROM contact_relationships WHERE contact_id = c.id AND is_active = true) as relationship_count,
    (SELECT COUNT(*)::int FROM contact_notes WHERE contact_id = c.id) as note_count,
    COALESCE(
      (SELECT ARRAY_AGG(cr.name) FROM contact_role_assignments cra
       JOIN contact_roles cr ON cr.id = cra.role_id
       WHERE cra.contact_id = c.id),
      ARRAY[]::text[]
    ) as roles
   FROM contacts c
   LEFT JOIN accounts a ON c.account_id = a.id
   WHERE c.id = $1`;

export const trimToNull = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return value === null || value === undefined ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeEmailValue = (value: unknown): string | null => {
  const normalized = trimToNull(value);
  return normalized ? normalized.toLowerCase() : null;
};

export const normalizePhoneValue = (value: unknown): string | null => trimToNull(value);

export const normalizePhoneMatchKey = (value: unknown): string | null => {
  const normalized = trimToNull(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

export const normalizeArrayValue = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => trimToNull(item))
        .filter((item): item is string => Boolean(item))
    )
  ).sort();
};

export const mergeTextValue = (left: string | null, right: string | null): string | null => {
  const values = [left, right]
    .map((value) => trimToNull(value))
    .filter((value): value is string => Boolean(value));
  if (values.length === 0) {
    return null;
  }

  const uniqueValues = Array.from(new Set(values));
  return uniqueValues.join('\n\n');
};

export const chooseNonOtherLabel = (existing: string | null, incoming: string | null): string | null => {
  const normalizedExisting = trimToNull(existing);
  const normalizedIncoming = trimToNull(incoming);

  if (!normalizedExisting) {
    return normalizedIncoming;
  }
  if (normalizedExisting !== 'other') {
    return normalizedExisting;
  }
  return normalizedIncoming ?? normalizedExisting;
};

const BOOLEAN_CONTACT_FIELDS = new Set<string>([
  'no_fixed_address',
  'do_not_email',
  'do_not_phone',
  'do_not_text',
  'do_not_voicemail',
  'is_active',
]);

export const normalizeContactMergeFieldValue = (field: string, value: unknown): MergeScalarValue => {
  if (field === 'tags' || field === 'roles') {
    return normalizeArrayValue(value);
  }
  if (BOOLEAN_CONTACT_FIELDS.has(field)) {
    return typeof value === 'boolean' ? value : Boolean(value);
  }
  return trimToNull(value);
};

export const areEqualMergeValues = (left: MergeScalarValue, right: MergeScalarValue): boolean => {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return left === right;
};

export const createMergeValidationError = (message: string): Error =>
  Object.assign(new Error(message), {
    statusCode: 400,
    code: 'validation_error',
  });

export const ARRAY_MERGE_FIELDS = new Set(['tags', 'roles', 'skills', 'preferred_roles', 'certifications']);
export const BOOLEAN_MERGE_FIELDS = new Set([
  'no_fixed_address',
  'do_not_email',
  'do_not_phone',
  'do_not_text',
  'do_not_voicemail',
  'is_active',
]);
export const DATE_MERGE_FIELDS = new Set([
  'birth_date',
  'background_check_date',
  'background_check_expiry',
  'volunteer_since',
]);
export const NUMBER_MERGE_FIELDS = new Set(['max_hours_per_week', 'total_hours_logged', 'hours_contributed']);

export const normalizeMergeFieldValue = (field: string, value: unknown): MergeScalarValue => {
  if (ARRAY_MERGE_FIELDS.has(field)) {
    return normalizeArrayValue(value);
  }

  if (BOOLEAN_MERGE_FIELDS.has(field)) {
    return typeof value === 'boolean' ? value : Boolean(value);
  }

  if (DATE_MERGE_FIELDS.has(field)) {
    return value === null || value === undefined ? null : normalizeDateOnly(value);
  }

  if (NUMBER_MERGE_FIELDS.has(field)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  return trimToNull(value);
};

export const setContactMethodPrimary = async (
  client: PoolClient,
  contactId: string,
  keepRowId: string,
  table: 'contact_phone_numbers' | 'contact_email_addresses',
  labelCondition: string | null = null
): Promise<void> => {
  const labelClause = labelCondition ? ` AND ${labelCondition}` : '';
  await client.query(
    `UPDATE ${table}
     SET is_primary = CASE WHEN id = $2 THEN true ELSE false END
     WHERE contact_id = $1${labelClause}`,
    [contactId, keepRowId]
  );
};

export const loadMergedContact = async (
  queryable: Queryable,
  contactId: string,
  viewerRole?: ViewerRole
): Promise<(Contact & { roles: string[] }) | null> => {
  const result = await queryable.query<ContactRecord>(CONTACT_BY_ID_SQL, [contactId]);
  const row = result.rows[0] as ContactRecord | undefined;
  return row ? (mapContactRow(row, viewerRole) as Contact & { roles: string[] }) : null;
};

export type ContactMergeSimpleUpdate = {
  key: string;
  sql: string;
  params: string[];
};

export const buildContactMergeSimpleUpdates = (
  sourceContactId: string,
  targetContactId: string,
  userId: string
): ContactMergeSimpleUpdate[] => [
  {
    key: 'contact_notes',
    sql: 'UPDATE contact_notes SET contact_id = $2 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'contact_documents',
    sql: 'UPDATE contact_documents SET contact_id = $2 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'cases',
    sql: 'UPDATE cases SET contact_id = $2, modified_by = $3 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId, userId],
  },
  {
    key: 'appointments',
    sql: 'UPDATE appointments SET contact_id = $2 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'donations',
    sql: 'UPDATE donations SET contact_id = $2, modified_by = $3 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId, userId],
  },
  {
    key: 'opportunities',
    sql: 'UPDATE opportunities SET contact_id = $2, modified_by = $3 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId, userId],
  },
  {
    key: 'recurring_donation_plans',
    sql: 'UPDATE recurring_donation_plans SET contact_id = $2, modified_by = $3 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId, userId],
  },
  {
    key: 'portal_users',
    sql: 'UPDATE portal_users SET contact_id = $2 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'portal_signup_requests',
    sql: 'UPDATE portal_signup_requests SET contact_id = $2 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'portal_invitations',
    sql: 'UPDATE portal_invitations SET contact_id = $2 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'portal_threads',
    sql: 'UPDATE portal_threads SET contact_id = $2 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'tasks',
    sql: "UPDATE tasks SET related_to_id = $2, modified_by = $3 WHERE related_to_type = 'contact' AND related_to_id = $1",
    params: [sourceContactId, targetContactId, userId],
  },
  {
    key: 'activities',
    sql: "UPDATE activities SET regarding_id = $2 WHERE regarding_type = 'contact' AND regarding_id = $1",
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'activity_events_entity',
    sql: "UPDATE activity_events SET entity_id = $2 WHERE entity_type = 'contact' AND entity_id = $1",
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'activity_events_related',
    sql: "UPDATE activity_events SET related_entity_id = $2 WHERE related_entity_type = 'contact' AND related_entity_id = $1",
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'public_submissions',
    sql: "UPDATE public_submissions SET result_entity_id = $2 WHERE result_entity_type = 'contact' AND result_entity_id = $1",
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'conversion_events',
    sql: "UPDATE conversion_events SET source_entity_id = $2 WHERE source_entity_type = 'contact' AND source_entity_id = $1",
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'meetings_presiding',
    sql: 'UPDATE meetings SET presiding_contact_id = $2 WHERE presiding_contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'meetings_secretary',
    sql: 'UPDATE meetings SET secretary_contact_id = $2 WHERE secretary_contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'meeting_agenda_items',
    sql: 'UPDATE meeting_agenda_items SET presenter_contact_id = $2 WHERE presenter_contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'meeting_motions_moved',
    sql: 'UPDATE meeting_motions SET moved_by_contact_id = $2 WHERE moved_by_contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'meeting_motions_seconded',
    sql: 'UPDATE meeting_motions SET seconded_by_contact_id = $2 WHERE seconded_by_contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'meeting_action_items',
    sql: 'UPDATE meeting_action_items SET assigned_contact_id = $2 WHERE assigned_contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'event_registrations',
    sql: 'UPDATE event_registrations SET contact_id = $2 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
  {
    key: 'committee_members',
    sql: 'UPDATE committee_members SET contact_id = $2 WHERE contact_id = $1',
    params: [sourceContactId, targetContactId],
  },
];
