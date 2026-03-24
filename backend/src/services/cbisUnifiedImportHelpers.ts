import { normalizeName } from '../ingest/utils';

export type CbisRecordType =
  | 'participant'
  | 'client'
  | 'client_activity'
  | 'client_lead'
  | 'staff'
  | 'staff_activity'
  | 'org'
  | 'event'
  | 'reference'
  | 'other';

export interface CbisMasterClusterRow {
  cluster_id: string;
  record_type: string;
  primary_label: string;
  primary_label_kind: string;
  primary_source_table: string;
  primary_source_file: string;
  primary_source_row_id: string;
  primary_source_row_number: string;
  source_row_count: string;
  source_table_count: string;
  source_file_count: string;
  source_tables: string;
  source_files: string;
  source_row_ids: string;
  participant_ids: string;
  all_names: string;
  all_phones: string;
  all_emails: string;
  all_addresses: string;
  all_dobs: string;
  first_seen_date: string;
  last_seen_date: string;
  link_confidence: string;
  link_basis: string;
  source_type_breakdown: string;
}

export interface CbisClusterSummary {
  clusterId: string;
  recordType: CbisRecordType | string;
  primaryLabel: string;
  primaryLabelKind: string;
  primarySourceTable: string;
  primarySourceFile: string;
  primarySourceRowId: string;
  primarySourceRowNumber: number | null;
  sourceRowCount: number;
  sourceTableCount: number;
  sourceFileCount: number;
  sourceTables: string[];
  sourceFiles: string[];
  sourceRowIds: string[];
  participantIds: string[];
  allNames: string[];
  allPhones: string[];
  allEmails: string[];
  allAddresses: string[];
  allDobs: string[];
  firstSeenDate: string | null;
  lastSeenDate: string | null;
  linkConfidence: number | null;
  linkBasis: string[];
  sourceTypeBreakdown: string[];
}

const splitTokenList = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith('+'));
};

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

export const parseInteger = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseFloatLike = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseFlexibleDate = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || /^0{1,4}[-/]0{1,2}[-/]0{1,2}$/.test(trimmed)) {
    return null;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = Number.parseInt(slashMatch[1], 10);
    const day = Number.parseInt(slashMatch[2], 10);
    let year = Number.parseInt(slashMatch[3], 10);
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
};

export const parseFlexibleTime = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || /^0{1,2}:0{1,2}(:0{1,2})?$/.test(trimmed)) {
    return null;
  }

  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!timeMatch) {
    return null;
  }

  const hours = Number.parseInt(timeMatch[1], 10);
  const minutes = Number.parseInt(timeMatch[2], 10);
  const seconds = Number.parseInt(timeMatch[3] ?? '0', 10);

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const splitHumanName = (
  value: string | null | undefined
): { firstName: string; lastName: string } => {
  const trimmed = value?.trim().replace(/\s+/g, ' ') ?? '';
  if (!trimmed) {
    return { firstName: 'Unknown', lastName: 'Client' };
  }

  const parts = trimmed.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Client' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || 'Client',
  };
};

export const normalizeClusterRecordType = (value: string | null | undefined): CbisRecordType | string => {
  const normalized = normalizeName(value ?? '');
  if (!normalized) {
    return 'other';
  }

  if (
    normalized === 'participant' ||
    normalized === 'client' ||
    normalized === 'client_activity' ||
    normalized === 'client_lead' ||
    normalized === 'staff' ||
    normalized === 'staff_activity' ||
    normalized === 'org' ||
    normalized === 'event' ||
    normalized === 'reference' ||
    normalized === 'other'
  ) {
    return normalized;
  }

  return normalized;
};

export const inferCaseTypeName = (cluster: CbisClusterSummary): string => {
  const sourceTables = new Set(cluster.sourceTables.map((table) => table.toLowerCase()));
  const label = `${cluster.primaryLabel} ${cluster.sourceTables.join(' ')}`.toLowerCase();

  if (sourceTables.has('deceased') || label.includes('crisis') || label.includes('incident')) {
    return 'Crisis Intervention';
  }
  if (label.includes('counsel') || label.includes('mental health')) {
    return 'Counseling';
  }
  if (label.includes('legal')) {
    return 'Legal Assistance';
  }
  if (label.includes('housing') || label.includes('homeless')) {
    return 'Housing';
  }
  if (label.includes('employment') || label.includes('job placement') || label.includes('work')) {
    return 'Employment';
  }
  if (label.includes('health') || label.includes('medical')) {
    return 'Healthcare';
  }
  if (label.includes('financial') || label.includes('income') || label.includes('donation')) {
    return 'Financial Assistance';
  }

  return 'General Support';
};

export const inferCaseStatusName = (cluster: CbisClusterSummary): string => {
  const label = `${cluster.primaryLabel} ${cluster.sourceTables.join(' ')}`.toLowerCase();
  if (label.includes('deceased') || label.includes('exit') || label.includes('closed')) {
    return 'Closed - Successful';
  }
  if (cluster.recordType === 'client_lead') {
    return 'Intake';
  }

  return 'Active';
};

export const summarizeRow = (
  row: Record<string, string | null>,
  preferredKeys: string[],
  fallbackLabel: string
): string => {
  const lines = preferredKeys
    .map((key) => {
      const value = row[key];
      if (value === null || value === undefined || value.trim().length === 0) {
        return null;
      }
      const label = key.replace(/_/g, ' ');
      return `${label}: ${value.trim()}`;
    })
    .filter((line): line is string => line !== null);

  if (lines.length > 0) {
    return lines.join('\n');
  }

  const compact = Object.entries(row)
    .filter(([, value]) => value !== null && value !== undefined && value.trim().length > 0)
    .slice(0, 8)
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value?.trim()}`)
    .join('\n');

  return compact || fallbackLabel;
};

export const buildClusterSummary = (row: CbisMasterClusterRow): CbisClusterSummary => ({
  clusterId: row.cluster_id,
  recordType: normalizeClusterRecordType(row.record_type),
  primaryLabel: row.primary_label?.trim() || 'Unknown',
  primaryLabelKind: row.primary_label_kind?.trim() || 'unknown',
  primarySourceTable: row.primary_source_table?.trim() || '',
  primarySourceFile: row.primary_source_file?.trim() || '',
  primarySourceRowId: row.primary_source_row_id?.trim() || '',
  primarySourceRowNumber: parseInteger(row.primary_source_row_number),
  sourceRowCount: parseInteger(row.source_row_count) ?? 0,
  sourceTableCount: parseInteger(row.source_table_count) ?? 0,
  sourceFileCount: parseInteger(row.source_file_count) ?? 0,
  sourceTables: unique(splitTokenList(row.source_tables)),
  sourceFiles: unique(splitTokenList(row.source_files)),
  sourceRowIds: unique(splitTokenList(row.source_row_ids)),
  participantIds: unique(splitTokenList(row.participant_ids)),
  allNames: unique(splitTokenList(row.all_names)),
  allPhones: unique(splitTokenList(row.all_phones)),
  allEmails: unique(splitTokenList(row.all_emails)),
  allAddresses: unique(splitTokenList(row.all_addresses)),
  allDobs: unique(splitTokenList(row.all_dobs)),
  firstSeenDate: parseFlexibleDate(row.first_seen_date),
  lastSeenDate: parseFlexibleDate(row.last_seen_date),
  linkConfidence: parseFloatLike(row.link_confidence),
  linkBasis: unique(splitTokenList(row.link_basis)),
  sourceTypeBreakdown: unique(splitTokenList(row.source_type_breakdown)),
});

export const getMasterRowIdentityKeys = (row: CbisMasterClusterRow): string[] => {
  return unique([row.cluster_id, row.primary_source_row_id, ...splitTokenList(row.source_row_ids)]);
};

export const choosePrimaryValue = (values: string[]): string | null => {
  return values.find((value) => value.trim().length > 0)?.trim() ?? null;
};
