import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export const CBIS_IMPORT_ENTITY_ORDER = [
  'accounts',
  'contacts',
  'cases',
  'case_type_assignments',
  'case_outcome_assignments',
  'events',
  'event_occurrences',
  'event_registrations',
  'activities',
  'activity_events',
  'donations',
  'volunteers',
  'volunteer_hours',
  'follow_ups',
] as const;

export type CbisImportEntityType = (typeof CBIS_IMPORT_ENTITY_ORDER)[number];

export const CBIS_IMPORT_FILES: Record<CbisImportEntityType, string> = {
  accounts: 'cbis_import_accounts.csv',
  contacts: 'cbis_import_contacts.csv',
  cases: 'cbis_import_cases.csv',
  case_type_assignments: 'cbis_import_case_type_assignments.csv',
  case_outcome_assignments: 'cbis_import_case_outcome_assignments.csv',
  events: 'cbis_import_events.csv',
  event_occurrences: 'cbis_import_event_occurrences.csv',
  event_registrations: 'cbis_import_event_registrations.csv',
  activities: 'cbis_import_activities.csv',
  activity_events: 'cbis_import_activity_events.csv',
  donations: 'cbis_import_donations.csv',
  volunteers: 'cbis_import_volunteers.csv',
  volunteer_hours: 'cbis_import_volunteer_hours.csv',
  follow_ups: 'cbis_import_follow_ups.csv',
};

const REQUIRED_SUPPORT_FILES = [
  'cbis_import_summary.json',
  'cbis_import_entity_map.csv',
  'cbis_import_gap_report.csv',
  'nonprofit_manager_schema_bundle.json',
  'cbis_import_readiness_report.md',
] as const;

export type CbisImportRow = Record<string, string>;

export interface CbisImportSummaryFile {
  schema_bundle_version?: string;
  entity_status_counts?: Record<string, Record<string, number>>;
  [key: string]: unknown;
}

export interface CbisSchemaBundle {
  version?: string;
  [key: string]: unknown;
}

export interface LoadedCbisImportBundle {
  bundleDir: string;
  fingerprint: string;
  summary: CbisImportSummaryFile;
  schemaBundle: CbisSchemaBundle;
  entities: Record<CbisImportEntityType, CbisImportRow[]>;
  entityMapRows: CbisImportRow[];
  gapRows: CbisImportRow[];
  readinessReportPath: string;
}

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && character === ',') {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
};

const splitCsvRecords = (text: string): string[] => {
  const records: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      current += character;
      if (inQuotes && next === '"') {
        current += next;
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && character === '\n') {
      records.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  if (current.length > 0) {
    records.push(current);
  }

  return records;
};

export const parseCsv = (text: string): CbisImportRow[] => {
  const records = splitCsvRecords(text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n'))
    .filter((record) => record.trim().length > 0);
  const [headerRecord, ...dataRecords] = records;
  if (!headerRecord) {
    return [];
  }

  const headers = parseCsvLine(headerRecord).map((header) => header.trim());
  return dataRecords
    .map((record) => parseCsvLine(record))
    .map((values) =>
      headers.reduce<CbisImportRow>((row, header, index) => {
        row[header] = values[index]?.trim() ?? '';
        return row;
      }, {})
    );
};

const readJson = async <T>(filePath: string): Promise<T> => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
};

const assertFileExists = async (filePath: string): Promise<void> => {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`${filePath} is not a file`);
    }
  } catch (error) {
    throw Object.assign(new Error(`Missing required CBIS import bundle file: ${filePath}`), {
      cause: error,
    });
  }
};

const hashFile = async (hash: crypto.Hash, filePath: string): Promise<void> => {
  hash.update(path.basename(filePath));
  hash.update('\0');
  hash.update(await fs.readFile(filePath));
  hash.update('\0');
};

const computeBundleFingerprint = async (bundleDir: string): Promise<string> => {
  const hash = crypto.createHash('sha256');
  for (const filename of [...REQUIRED_SUPPORT_FILES, ...Object.values(CBIS_IMPORT_FILES)].sort()) {
    await hashFile(hash, path.join(bundleDir, filename));
  }
  return `sha256:${hash.digest('hex')}`;
};

export const loadCbisImportBundle = async (bundleDirInput: string): Promise<LoadedCbisImportBundle> => {
  const bundleDir = path.resolve(bundleDirInput);
  const requiredFiles = [...REQUIRED_SUPPORT_FILES, ...Object.values(CBIS_IMPORT_FILES)];

  await Promise.all(requiredFiles.map((filename) => assertFileExists(path.join(bundleDir, filename))));

  const summaryPath = path.join(bundleDir, 'cbis_import_summary.json');
  const schemaPath = path.join(bundleDir, 'nonprofit_manager_schema_bundle.json');
  const summary = await readJson<CbisImportSummaryFile>(summaryPath);
  const schemaBundle = await readJson<CbisSchemaBundle>(schemaPath);
  const schemaVersion = schemaBundle.version ?? summary.schema_bundle_version;
  if (!schemaVersion) {
    throw new Error('CBIS import bundle is missing a schema bundle version');
  }

  const entities = {} as Record<CbisImportEntityType, CbisImportRow[]>;
  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    const fileContent = await fs.readFile(path.join(bundleDir, CBIS_IMPORT_FILES[entityType]), 'utf8');
    entities[entityType] = parseCsv(fileContent);
  }

  const [entityMapRows, gapRows, fingerprint] = await Promise.all([
    fs.readFile(path.join(bundleDir, 'cbis_import_entity_map.csv'), 'utf8').then(parseCsv),
    fs.readFile(path.join(bundleDir, 'cbis_import_gap_report.csv'), 'utf8').then(parseCsv),
    computeBundleFingerprint(bundleDir),
  ]);

  return {
    bundleDir,
    fingerprint,
    summary,
    schemaBundle,
    entities,
    entityMapRows,
    gapRows,
    readinessReportPath: path.join(bundleDir, 'cbis_import_readiness_report.md'),
  };
};

export const getSchemaBundleVersion = (bundle: LoadedCbisImportBundle): string =>
  bundle.schemaBundle.version ?? bundle.summary.schema_bundle_version ?? 'unknown';
