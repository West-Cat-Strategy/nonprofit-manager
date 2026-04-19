import {
  getMappedValue,
  hasMappedField,
  parseBooleanLike,
  parseDelimitedList,
  parseNumberLike,
  toNullableString,
  toTrimmedString,
} from '@modules/shared/import/importUtils';
import type {
  ParsedVolunteerImportRow,
  VolunteerAccountLookup,
  VolunteerImportIdentityLookup,
} from '../volunteerImportExport.types';
import { volunteerFieldSchema } from '../volunteerImportExport.types';

export const mapVolunteerImportRow = (
  row: Record<string, string | null>,
  mapping: Record<string, string>
): ParsedVolunteerImportRow => {
  const parseArrayField = (
    field: 'tags' | 'roles' | 'skills' | 'preferred_roles' | 'certifications'
  ): string[] | undefined => {
    if (!hasMappedField(mapping, field)) {
      return undefined;
    }

    const value = getMappedValue(row, mapping, field);
    return value === null ? [] : parseDelimitedList(value);
  };

  const normalizeAvailability = (
    value: string | null | undefined
  ): ParsedVolunteerImportRow['availability_status'] => {
    const normalized = toTrimmedString(value)?.toLowerCase();
    return normalized === 'available' || normalized === 'unavailable' || normalized === 'limited'
      ? normalized
      : undefined;
  };

  const normalizeBackgroundStatus = (
    value: string | null | undefined
  ): ParsedVolunteerImportRow['background_check_status'] => {
    const normalized = toTrimmedString(value)?.toLowerCase();
    return volunteerFieldSchema.shape.background_check_status.safeParse(normalized).success
      ? (normalized as ParsedVolunteerImportRow['background_check_status'])
      : undefined;
  };

  return {
    volunteer_id: toTrimmedString(getMappedValue(row, mapping, 'volunteer_id')),
    contact_id: toTrimmedString(getMappedValue(row, mapping, 'contact_id')),
    account_id: toNullableString(getMappedValue(row, mapping, 'account_id')),
    account_number: toNullableString(getMappedValue(row, mapping, 'account_number')),
    first_name: toNullableString(getMappedValue(row, mapping, 'first_name')),
    preferred_name: toNullableString(getMappedValue(row, mapping, 'preferred_name')),
    last_name: toNullableString(getMappedValue(row, mapping, 'last_name')),
    middle_name: toNullableString(getMappedValue(row, mapping, 'middle_name')),
    salutation: toNullableString(getMappedValue(row, mapping, 'salutation')),
    suffix: toNullableString(getMappedValue(row, mapping, 'suffix')),
    birth_date: toNullableString(getMappedValue(row, mapping, 'birth_date')),
    gender: toNullableString(getMappedValue(row, mapping, 'gender')),
    pronouns: toNullableString(getMappedValue(row, mapping, 'pronouns')),
    phn: toNullableString(getMappedValue(row, mapping, 'phn')),
    email: toNullableString(getMappedValue(row, mapping, 'email')),
    phone: toNullableString(getMappedValue(row, mapping, 'phone')),
    mobile_phone: toNullableString(getMappedValue(row, mapping, 'mobile_phone')),
    address_line1: toNullableString(getMappedValue(row, mapping, 'address_line1')),
    address_line2: toNullableString(getMappedValue(row, mapping, 'address_line2')),
    city: toNullableString(getMappedValue(row, mapping, 'city')),
    state_province: toNullableString(getMappedValue(row, mapping, 'state_province')),
    postal_code: toNullableString(getMappedValue(row, mapping, 'postal_code')),
    country: toNullableString(getMappedValue(row, mapping, 'country')),
    no_fixed_address: parseBooleanLike(getMappedValue(row, mapping, 'no_fixed_address')),
    job_title: toNullableString(getMappedValue(row, mapping, 'job_title')),
    department: toNullableString(getMappedValue(row, mapping, 'department')),
    preferred_contact_method: toNullableString(
      getMappedValue(row, mapping, 'preferred_contact_method')
    ),
    do_not_email: parseBooleanLike(getMappedValue(row, mapping, 'do_not_email')),
    do_not_phone: parseBooleanLike(getMappedValue(row, mapping, 'do_not_phone')),
    do_not_text: parseBooleanLike(getMappedValue(row, mapping, 'do_not_text')),
    do_not_voicemail: parseBooleanLike(getMappedValue(row, mapping, 'do_not_voicemail')),
    notes: toNullableString(getMappedValue(row, mapping, 'notes')),
    tags: parseArrayField('tags'),
    roles: parseArrayField('roles'),
    skills: parseArrayField('skills'),
    availability_status: normalizeAvailability(getMappedValue(row, mapping, 'availability_status')),
    availability_notes: toNullableString(getMappedValue(row, mapping, 'availability_notes')),
    background_check_status: normalizeBackgroundStatus(
      getMappedValue(row, mapping, 'background_check_status')
    ),
    background_check_date: toNullableString(getMappedValue(row, mapping, 'background_check_date')),
    background_check_expiry: toNullableString(
      getMappedValue(row, mapping, 'background_check_expiry')
    ),
    preferred_roles: parseArrayField('preferred_roles'),
    certifications: parseArrayField('certifications'),
    max_hours_per_week: (() => {
      const value = getMappedValue(row, mapping, 'max_hours_per_week');
      if (value === null && hasMappedField(mapping, 'max_hours_per_week')) {
        return null;
      }

      const parsedValue = parseNumberLike(value);
      return parsedValue ?? undefined;
    })(),
    emergency_contact_name: toNullableString(
      getMappedValue(row, mapping, 'emergency_contact_name')
    ),
    emergency_contact_phone: toNullableString(
      getMappedValue(row, mapping, 'emergency_contact_phone')
    ),
    emergency_contact_relationship: toNullableString(
      getMappedValue(row, mapping, 'emergency_contact_relationship')
    ),
    is_active: parseBooleanLike(getMappedValue(row, mapping, 'is_active')),
  };
};

export const resolveVolunteerAccountReference = (
  payload: ParsedVolunteerImportRow,
  accountLookup: VolunteerAccountLookup,
  organizationId: string,
  mapping: Record<string, string>,
  messages: string[]
): string | null | undefined => {
  const accountIdWasMapped = hasMappedField(mapping, 'account_id');
  const accountNumberWasMapped = hasMappedField(mapping, 'account_number');

  if (!accountIdWasMapped && !accountNumberWasMapped) {
    return undefined;
  }

  let resolvedFromId: string | undefined;
  let resolvedFromNumber: string | undefined;

  if (payload.account_id) {
    resolvedFromId = accountLookup.byId.get(payload.account_id);
    if (!resolvedFromId) {
      messages.push(`Account ID ${payload.account_id} was not found.`);
    }
  }

  if (payload.account_number) {
    resolvedFromNumber = accountLookup.byNumber.get(payload.account_number);
    if (!resolvedFromNumber) {
      messages.push(`Account number ${payload.account_number} was not found.`);
    }
  }

  if (resolvedFromId && resolvedFromNumber && resolvedFromId !== resolvedFromNumber) {
    messages.push('Account ID and account number reference different accounts.');
    return undefined;
  }

  return resolvedFromId ?? resolvedFromNumber ?? organizationId;
};

export const resolveVolunteerIdentity = (
  payload: ParsedVolunteerImportRow,
  identities: VolunteerImportIdentityLookup,
  messages: string[]
): { matchedVolunteerId?: string; matchedContactId?: string } => {
  let matchedVolunteerId: string | undefined;
  let matchedContactId: string | undefined;

  if (payload.volunteer_id) {
    const identity = identities.byVolunteerId.get(payload.volunteer_id);
    if (!identity) {
      messages.push(
        `Volunteer ID ${payload.volunteer_id} was not found in the active organization.`
      );
      return {};
    }

    matchedVolunteerId = identity.volunteerId;
    matchedContactId = identity.contactId;
    return { matchedVolunteerId, matchedContactId };
  }

  if (payload.contact_id) {
    const identity = identities.byContactId.get(payload.contact_id);
    if (!identity) {
      messages.push(`Contact ID ${payload.contact_id} was not found in the active organization.`);
      return {};
    }

    matchedVolunteerId = identity.volunteerId;
    matchedContactId = identity.contactId;
    return { matchedVolunteerId, matchedContactId };
  }

  if (payload.email) {
    const identitiesByEmail = identities.byEmail.get(payload.email.toLowerCase()) ?? [];
    if (identitiesByEmail.length > 1) {
      messages.push(
        `Email ${payload.email} matches multiple contacts in the active organization.`
      );
      return {};
    }

    if (identitiesByEmail.length === 1) {
      matchedVolunteerId = identitiesByEmail[0].volunteerId;
      matchedContactId = identitiesByEmail[0].contactId;
    }
  }

  return { matchedVolunteerId, matchedContactId };
};

export const buildVolunteerContactValidationPayload = (
  payload: ParsedVolunteerImportRow,
  resolvedAccountId: string | null | undefined,
  organizationId: string
) => ({
  account_id: resolvedAccountId ?? organizationId,
  first_name: payload.first_name,
  preferred_name: payload.preferred_name,
  last_name: payload.last_name,
  middle_name: payload.middle_name,
  salutation: payload.salutation,
  suffix: payload.suffix,
  birth_date: payload.birth_date ?? undefined,
  gender: payload.gender,
  pronouns: payload.pronouns,
  phn: payload.phn,
  email: payload.email,
  phone: payload.phone,
  mobile_phone: payload.mobile_phone,
  address_line1: payload.address_line1,
  address_line2: payload.address_line2,
  city: payload.city,
  state_province: payload.state_province,
  postal_code: payload.postal_code,
  country: payload.country,
  no_fixed_address: payload.no_fixed_address,
  job_title: payload.job_title,
  department: payload.department,
  preferred_contact_method: payload.preferred_contact_method,
  do_not_email: payload.do_not_email,
  do_not_phone: payload.do_not_phone,
  do_not_text: payload.do_not_text,
  do_not_voicemail: payload.do_not_voicemail,
  notes: payload.notes,
  tags: payload.tags,
  roles: payload.roles,
  is_active: payload.is_active,
});

export const buildVolunteerFieldValidationPayload = (payload: ParsedVolunteerImportRow) => ({
  skills: payload.skills,
  availability_status: payload.availability_status,
  availability_notes: payload.availability_notes,
  background_check_status: payload.background_check_status,
  background_check_date: payload.background_check_date ?? undefined,
  background_check_expiry: payload.background_check_expiry ?? undefined,
  preferred_roles: payload.preferred_roles,
  certifications: payload.certifications,
  max_hours_per_week: payload.max_hours_per_week,
  emergency_contact_name: payload.emergency_contact_name,
  emergency_contact_phone: payload.emergency_contact_phone,
  emergency_contact_relationship: payload.emergency_contact_relationship,
  is_active: payload.is_active,
});
