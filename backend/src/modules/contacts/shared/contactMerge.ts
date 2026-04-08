import type {
  Contact,
  ContactMergeCounts,
  ContactMergeFieldPreview,
  ContactMergePreview,
  ContactMergeResolution,
} from '@app-types/contact';

export interface ContactMergeFieldDefinition {
  key: string;
  label: string;
  source: 'contact' | 'volunteer';
  autoMerge?: boolean;
}

export interface ContactMergeVolunteerValues {
  [key: string]: unknown;
  availability_status?: string | null;
  availability_notes?: string | null;
  background_check_status?: string | null;
  background_check_date?: string | Date | null;
  background_check_expiry?: string | Date | null;
  preferred_roles?: string[] | null;
  certifications?: string[] | null;
  max_hours_per_week?: number | string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  skills?: string[] | null;
  volunteer_since?: string | Date | null;
  total_hours_logged?: number | string | null;
  hours_contributed?: number | string | null;
  is_active?: boolean | null;
  volunteer_status?: string | null;
}

const CONTACT_MERGE_FIELD_DEFINITIONS: ContactMergeFieldDefinition[] = [
  { key: 'account_id', label: 'Organization', source: 'contact' },
  { key: 'first_name', label: 'First name', source: 'contact' },
  { key: 'preferred_name', label: 'Preferred name', source: 'contact' },
  { key: 'last_name', label: 'Last name', source: 'contact' },
  { key: 'middle_name', label: 'Middle name', source: 'contact' },
  { key: 'salutation', label: 'Salutation', source: 'contact' },
  { key: 'suffix', label: 'Suffix', source: 'contact' },
  { key: 'birth_date', label: 'Date of birth', source: 'contact' },
  { key: 'gender', label: 'Gender', source: 'contact' },
  { key: 'pronouns', label: 'Pronouns', source: 'contact' },
  { key: 'phn', label: 'PHN', source: 'contact' },
  { key: 'email', label: 'Email', source: 'contact' },
  { key: 'phone', label: 'Phone', source: 'contact' },
  { key: 'mobile_phone', label: 'Mobile phone', source: 'contact' },
  { key: 'address_line1', label: 'Address line 1', source: 'contact' },
  { key: 'address_line2', label: 'Address line 2', source: 'contact' },
  { key: 'city', label: 'City', source: 'contact' },
  { key: 'state_province', label: 'State / province', source: 'contact' },
  { key: 'postal_code', label: 'Postal code', source: 'contact' },
  { key: 'country', label: 'Country', source: 'contact' },
  { key: 'job_title', label: 'Job title', source: 'contact' },
  { key: 'department', label: 'Department', source: 'contact' },
  { key: 'preferred_contact_method', label: 'Preferred contact method', source: 'contact' },
  { key: 'no_fixed_address', label: 'No fixed address', source: 'contact' },
  { key: 'do_not_email', label: 'Do not email', source: 'contact' },
  { key: 'do_not_phone', label: 'Do not phone', source: 'contact' },
  { key: 'do_not_text', label: 'Do not text', source: 'contact' },
  { key: 'do_not_voicemail', label: 'Do not voicemail', source: 'contact' },
  { key: 'notes', label: 'Notes', source: 'contact' },
  { key: 'is_active', label: 'Active status', source: 'contact' },
  { key: 'tags', label: 'Tags', source: 'contact', autoMerge: true },
  { key: 'roles', label: 'Roles', source: 'contact', autoMerge: true },
];

const VOLUNTEER_MERGE_FIELD_DEFINITIONS: ContactMergeFieldDefinition[] = [
  { key: 'availability_status', label: 'Volunteer availability', source: 'volunteer' },
  { key: 'availability_notes', label: 'Volunteer availability notes', source: 'volunteer', autoMerge: true },
  { key: 'background_check_status', label: 'Background check status', source: 'volunteer' },
  { key: 'background_check_date', label: 'Background check date', source: 'volunteer' },
  { key: 'background_check_expiry', label: 'Background check expiry', source: 'volunteer' },
  { key: 'skills', label: 'Skills', source: 'volunteer', autoMerge: true },
  { key: 'preferred_roles', label: 'Preferred volunteer roles', source: 'volunteer', autoMerge: true },
  { key: 'certifications', label: 'Certifications', source: 'volunteer', autoMerge: true },
  { key: 'max_hours_per_week', label: 'Max hours per week', source: 'volunteer' },
  { key: 'emergency_contact_name', label: 'Emergency contact name', source: 'volunteer' },
  { key: 'emergency_contact_phone', label: 'Emergency contact phone', source: 'volunteer' },
  { key: 'emergency_contact_relationship', label: 'Emergency contact relationship', source: 'volunteer' },
  { key: 'volunteer_since', label: 'Volunteer since', source: 'volunteer' },
  { key: 'total_hours_logged', label: 'Total hours logged', source: 'volunteer', autoMerge: true },
  { key: 'hours_contributed', label: 'Hours contributed', source: 'volunteer', autoMerge: true },
];

const MERGE_FIELD_DEFINITIONS = [
  ...CONTACT_MERGE_FIELD_DEFINITIONS,
  ...VOLUNTEER_MERGE_FIELD_DEFINITIONS,
];

const AUTO_MERGE_FIELDS = new Set(
  MERGE_FIELD_DEFINITIONS.filter((field) => field.autoMerge).map((field) => field.key)
);

const normalizeScalarValue = (value: unknown): string | number | boolean | string[] | null => {
  if (Array.isArray(value)) {
    return [...value]
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0)
      .sort();
  }

  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return String(value);
};

const isEqualValue = (
  left: string | number | boolean | string[] | null,
  right: string | number | boolean | string[] | null
): boolean => {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  return left === right;
};

const readFieldValue = (record: Record<string, unknown> | null | undefined, key: string): unknown => {
  if (!record) {
    return undefined;
  }
  return record[key];
};

const buildSummary = (contact: Contact & { roles: string[] }): ContactMergeCounts => ({
  phones: Number(contact.phone_count ?? 0),
  emails: Number(contact.email_count ?? 0),
  relationships: Number(contact.relationship_count ?? 0),
  notes: Number(contact.note_count ?? 0),
  documents: Number(contact.document_count ?? 0),
  roles: Number(contact.roles?.length ?? 0),
});

const buildFieldPreview = (
  definition: ContactMergeFieldDefinition,
  sourceRecord: Record<string, unknown>,
  targetRecord: Record<string, unknown>
): ContactMergeFieldPreview => {
  const sourceValue = normalizeScalarValue(readFieldValue(sourceRecord, definition.key));
  const targetValue = normalizeScalarValue(readFieldValue(targetRecord, definition.key));
  const autoMerged = Boolean(definition.autoMerge);
  const conflict =
    !autoMerged &&
    !isEqualValue(sourceValue, targetValue) &&
    sourceValue !== null &&
    targetValue !== null;

  return {
    field: definition.key,
    label: definition.label,
    source_value: sourceValue,
    target_value: targetValue,
    conflict,
    auto_merged: autoMerged,
  };
};

export const buildContactMergePreview = (
  sourceContact: Contact & { roles: string[] },
  targetContact: Contact & { roles: string[] },
  extras?: {
    sourceVolunteer?: ContactMergeVolunteerValues | null;
    targetVolunteer?: ContactMergeVolunteerValues | null;
  }
): ContactMergePreview => {
  const sourceVolunteer = extras?.sourceVolunteer ?? null;
  const targetVolunteer = extras?.targetVolunteer ?? null;

  const fields: ContactMergeFieldPreview[] = MERGE_FIELD_DEFINITIONS.map((definition) => {
    const sourceRecord =
      definition.source === 'contact'
        ? (sourceContact as unknown as Record<string, unknown>)
        : (sourceVolunteer as Record<string, unknown> | null);
    const targetRecord =
      definition.source === 'contact'
        ? (targetContact as unknown as Record<string, unknown>)
        : (targetVolunteer as Record<string, unknown> | null);

    return buildFieldPreview(
      definition,
      sourceRecord ?? {},
      targetRecord ?? {}
    );
  });

  return {
    source_contact: sourceContact,
    target_contact: targetContact,
    fields,
    source_summary: buildSummary(sourceContact),
    target_summary: buildSummary(targetContact),
  };
};

export const getMergeableFieldNames = (): string[] =>
  MERGE_FIELD_DEFINITIONS.map((field) => String(field.key));

export const getMergeableResolutionFieldNames = (): string[] =>
  MERGE_FIELD_DEFINITIONS.filter((field) => !AUTO_MERGE_FIELDS.has(field.key)).map((field) =>
    String(field.key)
  );

export const isAutoMergedField = (field: string): boolean => AUTO_MERGE_FIELDS.has(field);

export const normalizeMergeResolutionValue = (
  value: ContactMergeResolution | null | undefined
): ContactMergeResolution | null => {
  if (value === 'source' || value === 'target') {
    return value;
  }
  return null;
};
