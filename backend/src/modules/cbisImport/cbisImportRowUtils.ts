import type { CbisImportEntityType, CbisImportRow } from './cbisImportBundle';
import type { ImportProvenanceSource } from './cbisImportTypes';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const text = (row: CbisImportRow, key: string): string | null => {
  const value = row[key]?.trim();
  return value ? value : null;
};

export const requiredText = (row: CbisImportRow, key: string): string => {
  const value = text(row, key);
  if (!value) {
    throw new Error(`Missing required ${key}`);
  }
  return value;
};

export const truncateForVarchar = (value: string | null, maxLength: number): string | null => {
  if (!value || value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }
  return `${value.slice(0, maxLength - 3)}...`;
};

export const textMax = (row: CbisImportRow, key: string, maxLength: number): string | null =>
  truncateForVarchar(text(row, key), maxLength);

export const requiredTextMax = (row: CbisImportRow, key: string, maxLength: number): string =>
  truncateForVarchar(requiredText(row, key), maxLength) as string;

export const uuid = (row: CbisImportRow, key: string): string | null => {
  const value = text(row, key);
  if (!value) {
    return null;
  }
  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid UUID in ${key}: ${value}`);
  }
  return value;
};

export const requiredUuid = (row: CbisImportRow, key: string): string => {
  const value = uuid(row, key);
  if (!value) {
    throw new Error(`Missing required UUID ${key}`);
  }
  return value;
};

export const numberValue = (row: CbisImportRow, key: string): number | null => {
  const value = text(row, key);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number in ${key}: ${value}`);
  }
  return parsed;
};

export const intValue = (row: CbisImportRow, key: string): number | null => {
  const parsed = numberValue(row, key);
  return parsed === null ? null : Math.trunc(parsed);
};

export const boolValue = (row: CbisImportRow, key: string): boolean | null => {
  const value = text(row, key)?.toLowerCase();
  if (!value) {
    return null;
  }
  if (['true', '1', 'yes', 'y'].includes(value)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(value)) {
    return false;
  }
  throw new Error(`Invalid boolean in ${key}: ${value}`);
};

export const listValue = (row: CbisImportRow, key: string): string[] => {
  const value = text(row, key);
  if (!value) {
    return [];
  }
  return Array.from(new Set(value.split(/[|;,]/).map((item) => item.trim()).filter(Boolean)));
};

export const jsonValue = (row: CbisImportRow, key: string): unknown => {
  const value = text(row, key);
  if (!value) {
    return {};
  }
  try {
    return JSON.parse(value);
  } catch {
    return { legacy_value: value };
  }
};

export const statusFor = (row: CbisImportRow): string => text(row, 'row_status') ?? 'ready';

export const normalizeText = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
};

export const normalizePhone = (value: string | null): string | null => {
  const normalized = value?.replace(/\D/g, '') ?? '';
  return normalized.length >= 7 ? normalized : null;
};

export const targetIdColumnFor = (entityType: CbisImportEntityType): string => {
  const columns: Record<CbisImportEntityType, string> = {
    accounts: 'account_id',
    contacts: 'contact_id',
    cases: 'case_id',
    case_type_assignments: 'assignment_id',
    case_outcome_assignments: 'assignment_id',
    events: 'event_id',
    event_occurrences: 'occurrence_id',
    event_registrations: 'registration_id',
    activities: 'activity_id',
    activity_events: 'activity_event_id',
    donations: 'donation_id',
    volunteers: 'volunteer_id',
    volunteer_hours: 'volunteer_hour_id',
    follow_ups: 'follow_up_id',
  };
  return columns[entityType];
};

export const provenanceEntityAliases = (entityType: CbisImportEntityType): string[] => {
  const aliases: Record<CbisImportEntityType, string[]> = {
    accounts: ['account', 'accounts'],
    contacts: ['contact', 'contacts'],
    cases: ['case', 'cases'],
    case_type_assignments: ['case_type_assignment', 'case_type_assignments'],
    case_outcome_assignments: ['case_outcome_assignment', 'case_outcome_assignments'],
    events: ['event', 'events'],
    event_occurrences: ['event_occurrence', 'event_occurrences', 'occurrence'],
    event_registrations: ['event_registration', 'event_registrations', 'registration'],
    activities: ['activity', 'activities'],
    activity_events: ['activity_event', 'activity_events'],
    donations: ['donation', 'donations'],
    volunteers: ['volunteer', 'volunteers'],
    volunteer_hours: ['volunteer_hour', 'volunteer_hours'],
    follow_ups: ['follow_up', 'follow_ups'],
  };
  return aliases[entityType];
};

export const rowKey = (entityType: CbisImportEntityType, targetEntityId: string | null): string =>
  `${entityType}:${targetEntityId ?? 'missing-target-id'}`;

export const sourceKey = (source: ImportProvenanceSource): string =>
  `${source.source_file}\0${source.source_table}\0${source.source_row_id}`;

export const entitySourceKey = (entityType: CbisImportEntityType, source: ImportProvenanceSource): string =>
  `${entityType}\0${sourceKey(source)}`;

export const sourceHashKey = (entityType: CbisImportEntityType, sourceHash: string): string =>
  `${entityType}\0${sourceHash}`;
