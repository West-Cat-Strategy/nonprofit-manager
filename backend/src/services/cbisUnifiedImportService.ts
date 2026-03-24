import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import type { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import { normalizeName } from '../ingest/utils';
import {
  buildClusterSummary,
  choosePrimaryValue,
  inferCaseStatusName,
  inferCaseTypeName,
  parseFlexibleDate,
  parseFlexibleTime,
  splitHumanName,
  summarizeRow,
  type CbisClusterSummary,
  type CbisMasterClusterRow,
} from './cbisUnifiedImportHelpers';

type SourceDefinition = {
  sourceTable: string;
  sourceFile: string;
  sourceFileRef: string;
  sheetName: string | null;
  sourceKind: 'csv' | 'xlsx';
  sourceRole: string;
};

type SourceRow = {
  sourceTable: string;
  sourceFile: string;
  sourceRowNumber: number;
  sourceRowId: string;
  parentSourceRowId: string | null;
  clusterId: string | null;
  recordType: string | null;
  values: Record<string, string | null>;
};

export interface CbisUnifiedImportOptions {
  sourceDir: string;
  dryRun?: boolean;
  actorUserId?: string | null;
  reportPath?: string;
}

export interface CbisUnifiedImportReport {
  sourceDir: string;
  dryRun: boolean;
  sourceRowCount: number;
  masterRowCount: number;
  uniqueClusterCount: number;
  imported: Record<string, number>;
  stagedRows: number;
  processedRows: number;
  skippedRows: number;
  unresolvedRows: number;
  unresolvedClusters: Array<{
    clusterId: string;
    recordType: string;
    primaryLabel: string;
    sourceTables: string[];
    sourceRowCount: number;
  }>;
  unresolvedByRecordType: Record<string, number>;
  unresolvedBySourceTable: Record<string, number>;
  warnings: string[];
}

type EntityContext = {
  cluster: CbisClusterSummary;
  contactId?: string;
  accountId?: string;
  caseId?: string;
  eventId?: string;
  volunteerId?: string;
};

type MetadataFile = {
  source_row_count?: number;
  master_row_count?: number;
  cluster_count?: number;
  source_counts?: Record<string, number>;
  source_file_map?: Record<string, string>;
  source_kind_map?: Record<string, 'csv' | 'xlsx' | string>;
  source_role_map?: Record<string, string>;
};

const DEFAULT_USER_ID = null;

const readJsonFile = <T>(filePath: string): T => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
};

const toJson = (value: unknown): string => JSON.stringify(value);

const normalizeHeader = (value: string): string => normalizeName(value) || value.trim().toLowerCase();

const decodeXmlEntities = (value: string): string => {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
};

const unzipEntry = (filePath: string, entry: string): string => {
  return execFileSync('unzip', ['-p', filePath, entry], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
};

const getXlsxSheetPath = (filePath: string, sheetName: string | null): string | null => {
  const workbookXml = unzipEntry(filePath, 'xl/workbook.xml');
  const relsXml = unzipEntry(filePath, 'xl/_rels/workbook.xml.rels');

  const sheetMatch = sheetName
    ? Array.from(
        workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g)
      ).find((match) => decodeXmlEntities(match[1] ?? '') === sheetName)
    : null;
  const fallbackMatch = Array.from(workbookXml.matchAll(/<sheet[^>]*r:id="([^"]+)"[^>]*\/>/g))[0];
  const relId = sheetMatch?.[2] ?? fallbackMatch?.[1] ?? null;
  if (!relId) {
    return null;
  }

  const relMatch = Array.from(
    relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)
  ).find((match) => match[1] === relId);

  if (!relMatch?.[2]) {
    return null;
  }

  return `xl/${relMatch[2].replace(/^\/+/, '')}`;
};

const parseSharedStrings = (xml: string): string[] => {
  return Array.from(xml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map((match) =>
    decodeXmlEntities(
      Array.from(match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))
        .map((textMatch) => textMatch[1] ?? '')
        .join('')
    )
  );
};

const columnToNumber = (column: string): number => {
  let value = 0;
  for (const character of column) {
    value = value * 26 + (character.toUpperCase().charCodeAt(0) - 64);
  }
  return value;
};

const parseCsvRows = (buffer: Buffer): Array<Record<string, string | null>> => {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const firstLine = lines[0] ?? '';
  const candidates = [',', '\t', ';', '|'];
  const delimiter = candidates.reduce(
    (best, candidate) => {
      const count = (firstLine.match(new RegExp(`\\${candidate}`, 'g')) ?? []).length;
      return count > best.count ? { delimiter: candidate, count } : best;
    },
    { delimiter: ',', count: -1 }
  ).delimiter;

  const parseLine = (line: string): string[] => {
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

      if (!inQuotes && character === delimiter) {
        values.push(current);
        current = '';
        continue;
      }

      current += character;
    }

    values.push(current);
    return values;
  };

  const headers = parseLine(lines[0] ?? '').map((header, index) => normalizeHeader(header) || `column_${index + 1}`);
  const rows: Array<Record<string, string | null>> = [];

  for (const line of lines.slice(1)) {
    const values = parseLine(line);
    const row: Record<string, string | null> = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim() ?? '';
      row[header] = value.length > 0 ? value : null;
    });
    if (Object.values(row).some((value) => value !== null)) {
      rows.push(row);
    }
  }

  return rows;
};

const parseXlsxRows = (filePath: string, sheetName: string | null): Array<Record<string, string | null>> => {
  const sheetPath = getXlsxSheetPath(filePath, sheetName);
  if (!sheetPath) {
    return [];
  }

  const sharedStringsXml = (() => {
    try {
      return unzipEntry(filePath, 'xl/sharedStrings.xml');
    } catch {
      return '';
    }
  })();
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  const worksheetXml = unzipEntry(filePath, sheetPath);

  const rows: Array<Record<string, string | null>> = [];
  const rowMatches = Array.from(worksheetXml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g));
  const headers: string[] = [];

  for (const [rowIndex, rowMatch] of rowMatches.entries()) {
    const rowContent = rowMatch[2] ?? '';
    const cellValues = new Map<number, string | null>();
    const cellMatches = Array.from(rowContent.matchAll(/<c[^>]*r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g));

    for (const cellMatch of cellMatches) {
      const columnLetters = cellMatch[1] ?? '';
      const attributes = cellMatch[2] ?? '';
      const cellContent = cellMatch[3] ?? '';
      const columnNumber = columnToNumber(columnLetters);
      const typeMatch = attributes.match(/t="([^"]+)"/);
      const cellType = typeMatch?.[1] ?? null;
      const valueMatch = cellContent.match(/<v>([\s\S]*?)<\/v>/);
      const inlineTextMatch = cellContent.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/);

      let text = '';
      if (cellType === 's' && valueMatch) {
        const sharedIndex = Number.parseInt(valueMatch[1] ?? '', 10);
        text = sharedStrings[sharedIndex] ?? '';
      } else if (cellType === 'inlineStr' && inlineTextMatch) {
        text = decodeXmlEntities(inlineTextMatch[1] ?? '');
      } else if (valueMatch) {
        text = decodeXmlEntities(valueMatch[1] ?? '');
      }

      const normalized = text.trim();
      cellValues.set(columnNumber, normalized.length > 0 ? normalized : null);
    }

    if (rowIndex === 0) {
      for (const [columnNumber, value] of cellValues.entries()) {
        headers[columnNumber - 1] = normalizeHeader(value ?? '') || `column_${columnNumber}`;
      }
      continue;
    }

    const normalizedRow: Record<string, string | null> = {};
    for (const [columnNumber, value] of cellValues.entries()) {
      const header = headers[columnNumber - 1] || `column_${columnNumber}`;
      normalizedRow[header] = value;
    }

    if (Object.values(normalizedRow).some((value) => value !== null)) {
      rows.push(normalizedRow);
    }
  }

  return rows;
};

const loadSourceDefinition = (
  sourceTable: string,
  sourceFileRef: string,
  sourceKind: 'csv' | 'xlsx',
  sourceRole: string
): SourceDefinition => {
  const [sourceFile, sheetName] = sourceFileRef.split('::');
  return {
    sourceTable,
    sourceFile: sourceFile ?? sourceFileRef,
    sourceFileRef,
    sheetName: sheetName ?? null,
    sourceKind,
    sourceRole,
  };
};

const loadSourceRows = async (sourceDir: string, definition: SourceDefinition): Promise<SourceRow[]> => {
  const filePath = path.join(sourceDir, definition.sourceFile);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const buffer = fs.readFileSync(filePath);
  const parsedRows = definition.sourceKind === 'xlsx' ? parseXlsxRows(filePath, definition.sheetName) : parseCsvRows(buffer);

  return parsedRows.map((values, index) => {
    const rowId = values.id ?? values.row_id ?? values.source_row_id ?? `${definition.sourceTable}:${index + 1}`;
    const parentSourceRowId = values.parent_id ?? values.parent_source_row_id ?? null;
    return {
      sourceTable: definition.sourceTable,
      sourceFile: definition.sourceFileRef,
      sourceRowNumber: index + 2,
      sourceRowId: rowId,
      parentSourceRowId,
      clusterId: null,
      recordType: definition.sourceRole,
      values,
    };
  });
};

const buildMasterRow = (row: Record<string, string | null>): CbisMasterClusterRow => ({
  cluster_id: row.cluster_id ?? '',
  record_type: row.record_type ?? 'other',
  primary_label: row.primary_label ?? '',
  primary_label_kind: row.primary_label_kind ?? '',
  primary_source_table: row.primary_source_table ?? '',
  primary_source_file: row.primary_source_file ?? '',
  primary_source_row_id: row.primary_source_row_id ?? '',
  primary_source_row_number: row.primary_source_row_number ?? '',
  source_row_count: row.source_row_count ?? '',
  source_table_count: row.source_table_count ?? '',
  source_file_count: row.source_file_count ?? '',
  source_tables: row.source_tables ?? '',
  source_files: row.source_files ?? '',
  source_row_ids: row.source_row_ids ?? '',
  participant_ids: row.participant_ids ?? '',
  all_names: row.all_names ?? '',
  all_phones: row.all_phones ?? '',
  all_emails: row.all_emails ?? '',
  all_addresses: row.all_addresses ?? '',
  all_dobs: row.all_dobs ?? '',
  first_seen_date: row.first_seen_date ?? '',
  last_seen_date: row.last_seen_date ?? '',
  link_confidence: row.link_confidence ?? '',
  link_basis: row.link_basis ?? '',
  source_type_breakdown: row.source_type_breakdown ?? '',
});

const loadMasterClusters = (
  sourceDir: string
): {
  summaries: CbisClusterSummary[];
  sourceRowIdToClusterId: Map<string, string>;
  uniqueClusterCount: number;
} => {
  const masterPath = path.join(sourceDir, 'cbis_unified_master.csv');
  const rows = parseCsvRows(fs.readFileSync(masterPath));
  const byCluster = new Map<string, CbisClusterSummary>();
  const sourceRowIdToClusterId = new Map<string, string>();

  for (const row of rows) {
    const masterRow = buildMasterRow(row);
    if (!masterRow.cluster_id) {
      continue;
    }

    const summary = buildClusterSummary(masterRow);
    const existing = byCluster.get(summary.clusterId);
    if (!existing) {
      byCluster.set(summary.clusterId, summary);
    } else {
      existing.recordType = existing.recordType || summary.recordType;
      existing.primaryLabel = existing.primaryLabel || summary.primaryLabel;
      existing.primaryLabelKind = existing.primaryLabelKind || summary.primaryLabelKind;
      existing.primarySourceTable = existing.primarySourceTable || summary.primarySourceTable;
      existing.primarySourceFile = existing.primarySourceFile || summary.primarySourceFile;
      existing.primarySourceRowId = existing.primarySourceRowId || summary.primarySourceRowId;
      existing.primarySourceRowNumber = existing.primarySourceRowNumber ?? summary.primarySourceRowNumber;
      existing.sourceRowCount = Math.max(existing.sourceRowCount, summary.sourceRowCount);
      existing.sourceTableCount = Math.max(existing.sourceTableCount, summary.sourceTableCount);
      existing.sourceFileCount = Math.max(existing.sourceFileCount, summary.sourceFileCount);
      existing.sourceTables = Array.from(new Set([...existing.sourceTables, ...summary.sourceTables]));
      existing.sourceFiles = Array.from(new Set([...existing.sourceFiles, ...summary.sourceFiles]));
      existing.sourceRowIds = Array.from(new Set([...existing.sourceRowIds, ...summary.sourceRowIds]));
      existing.participantIds = Array.from(new Set([...existing.participantIds, ...summary.participantIds]));
      existing.allNames = Array.from(new Set([...existing.allNames, ...summary.allNames]));
      existing.allPhones = Array.from(new Set([...existing.allPhones, ...summary.allPhones]));
      existing.allEmails = Array.from(new Set([...existing.allEmails, ...summary.allEmails]));
      existing.allAddresses = Array.from(new Set([...existing.allAddresses, ...summary.allAddresses]));
      existing.allDobs = Array.from(new Set([...existing.allDobs, ...summary.allDobs]));
      existing.firstSeenDate = existing.firstSeenDate ?? summary.firstSeenDate;
      existing.lastSeenDate = summary.lastSeenDate ?? existing.lastSeenDate;
      existing.linkConfidence = Math.max(existing.linkConfidence ?? 0, summary.linkConfidence ?? 0) || null;
      existing.linkBasis = Array.from(new Set([...existing.linkBasis, ...summary.linkBasis]));
      existing.sourceTypeBreakdown = Array.from(
        new Set([...existing.sourceTypeBreakdown, ...summary.sourceTypeBreakdown])
      );
    }

    for (const identity of [
      summary.clusterId,
      summary.primarySourceRowId,
      ...summary.sourceRowIds,
      ...summary.participantIds,
    ]) {
      if (identity) {
        sourceRowIdToClusterId.set(identity, summary.clusterId);
      }
    }
  }

  return {
    summaries: Array.from(byCluster.values()),
    sourceRowIdToClusterId,
    uniqueClusterCount: byCluster.size,
  };
};

const getSourceDefinitions = (metadata: MetadataFile): SourceDefinition[] => {
  return Object.entries(metadata.source_file_map ?? {}).map(([sourceTable, sourceFileRef]) =>
    loadSourceDefinition(
      normalizeName(sourceTable),
      sourceFileRef,
      (metadata.source_kind_map?.[sourceTable] as 'csv' | 'xlsx' | undefined) ?? 'csv',
      metadata.source_role_map?.[sourceTable] ?? 'other'
    )
  );
};

const getCaseTypeId = async (client: PoolClient, name: string): Promise<string> => {
  const result = await client.query<{ id: string }>(
    'SELECT id FROM case_types WHERE LOWER(name) = LOWER($1) AND is_active = true LIMIT 1',
    [name]
  );

  if (result.rows[0]?.id) {
    return result.rows[0].id;
  }

  const fallback = await client.query<{ id: string }>(
    'SELECT id FROM case_types WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
  );

  if (!fallback.rows[0]?.id) {
    throw new Error(`No case types available to satisfy CBIS import mapping for ${name}`);
  }

  return fallback.rows[0].id;
};

const getCaseStatusId = async (client: PoolClient, name: string): Promise<string> => {
  const result = await client.query<{ id: string }>(
    'SELECT id FROM case_statuses WHERE LOWER(name) = LOWER($1) AND is_active = true LIMIT 1',
    [name]
  );

  if (result.rows[0]?.id) {
    return result.rows[0].id;
  }

  const fallback = await client.query<{ id: string }>(
    'SELECT id FROM case_statuses WHERE is_active = true ORDER BY sort_order ASC, created_at ASC LIMIT 1'
  );

  if (!fallback.rows[0]?.id) {
    throw new Error(`No case statuses available to satisfy CBIS import mapping for ${name}`);
  }

  return fallback.rows[0].id;
};

const ensureClusterEntity = async (
  client: PoolClient,
  jobId: string,
  cluster: CbisClusterSummary,
  entityType: 'account' | 'contact' | 'case' | 'event' | 'volunteer',
  createEntity: () => Promise<string>
): Promise<string> => {
  const existing = await client.query<{ entity_id: string }>(
    `SELECT entity_id
     FROM cbis_import_cluster_entities
     WHERE cluster_id = $1 AND entity_type = $2
     LIMIT 1`,
    [cluster.clusterId, entityType]
  );

  if (existing.rows[0]?.entity_id) {
    return existing.rows[0].entity_id;
  }

  const entityId = await createEntity();
  await client.query(
    `INSERT INTO cbis_import_cluster_entities (
       cluster_id, entity_type, entity_id, source_table, source_row_id, source_row_number,
       source_label, confidence, notes, job_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      cluster.clusterId,
      entityType,
      entityId,
      cluster.primarySourceTable || null,
      cluster.primarySourceRowId || null,
      cluster.primarySourceRowNumber,
      cluster.primaryLabel,
      cluster.linkConfidence ?? 1,
      cluster.linkBasis.join(' | ') || null,
      jobId,
    ]
  );

  return entityId;
};

const upsertSourceRow = async (
  client: PoolClient,
  jobId: string,
  row: SourceRow
): Promise<{ status: string; targetEntityType: string | null; targetEntityId: string | null }> => {
  const result = await client.query<{
    status: string;
    target_entity_type: string | null;
    target_entity_id: string | null;
  }>(
    `INSERT INTO cbis_import_source_rows (
       job_id, source_table, source_file, source_row_id, source_row_number, parent_source_row_id,
       cluster_id, record_type, row_payload, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'staged')
     ON CONFLICT (source_table, source_file, source_row_id)
     DO UPDATE SET
       parent_source_row_id = EXCLUDED.parent_source_row_id,
       cluster_id = EXCLUDED.cluster_id,
       record_type = EXCLUDED.record_type,
       row_payload = EXCLUDED.row_payload,
       updated_at = NOW()
     RETURNING status, target_entity_type, target_entity_id`,
    [
      jobId,
      row.sourceTable,
      row.sourceFile,
      row.sourceRowId,
      row.sourceRowNumber,
      row.parentSourceRowId,
      row.clusterId,
      row.recordType,
      toJson(row.values),
    ]
  );

  return {
    status: result.rows[0]?.status ?? 'staged',
    targetEntityType: result.rows[0]?.target_entity_type ?? null,
    targetEntityId: result.rows[0]?.target_entity_id ?? null,
  };
};

const markSourceRowProcessed = async (
  client: PoolClient,
  row: SourceRow,
  targetEntityType: string,
  targetEntityId: string | null,
  status: 'processed' | 'skipped' | 'failed' = 'processed',
  warnings: string[] = []
): Promise<void> => {
  await client.query(
    `UPDATE cbis_import_source_rows
     SET target_entity_type = $4,
         target_entity_id = $5::uuid,
         status = $6,
         warnings = $7,
         updated_at = NOW()
     WHERE source_table = $1 AND source_file = $2 AND source_row_id = $3`,
    [row.sourceTable, row.sourceFile, row.sourceRowId, targetEntityType, targetEntityId, status, warnings]
  );
};

const createContactFromCluster = async (
  client: PoolClient,
  jobId: string,
  cluster: CbisClusterSummary,
  userId: string | null
): Promise<string> => {
  return ensureClusterEntity(client, jobId, cluster, 'contact', async () => {
    const nameSource = choosePrimaryValue([
      cluster.primaryLabel,
      ...cluster.allNames,
      cluster.sourceTables.join(' '),
    ]);
    const { firstName, lastName } = splitHumanName(nameSource);
    const email = choosePrimaryValue(cluster.allEmails);
    const phone = choosePrimaryValue(cluster.allPhones);
    const address = choosePrimaryValue(cluster.allAddresses);
    const row = await client.query<{ id: string }>(
      `INSERT INTO contacts (
         first_name, last_name, email, phone, address_line1, notes, is_active, created_by, modified_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid, $9::uuid)
       RETURNING id`,
      [
        firstName,
        lastName,
        email,
        phone,
        address,
        `CBIS import cluster ${cluster.clusterId}\nSource tables: ${cluster.sourceTables.join(' | ')}`,
        !cluster.sourceTables.some((table) => table.toLowerCase().includes('deceased')),
        userId,
        userId,
      ]
    );

    return row.rows[0].id;
  });
};

const createAccountFromCluster = async (
  client: PoolClient,
  jobId: string,
  cluster: CbisClusterSummary,
  userId: string | null
): Promise<string> => {
  return ensureClusterEntity(client, jobId, cluster, 'account', async () => {
    const accountName = choosePrimaryValue([
      cluster.primaryLabel,
      ...cluster.allNames,
      cluster.sourceTables.join(' '),
    ]) ?? 'Imported organization';
    const row = await client.query<{ id: string }>(
      `INSERT INTO accounts (
         account_name, account_type, email, phone, description, is_active, created_by, modified_by
       ) VALUES ($1, $2, $3, $4, $5, true, $6::uuid, $7::uuid)
       RETURNING id`,
      [
        accountName,
        cluster.recordType === 'org' ? 'organization' : 'nonprofit',
        choosePrimaryValue(cluster.allEmails),
        choosePrimaryValue(cluster.allPhones),
        `CBIS import cluster ${cluster.clusterId}\nSource tables: ${cluster.sourceTables.join(' | ')}`,
        userId,
        userId,
      ]
    );

    return row.rows[0].id;
  });
};

const createCaseFromCluster = async (
  client: PoolClient,
  jobId: string,
  cluster: CbisClusterSummary,
  contactId: string,
  userId: string | null
): Promise<string> => {
  return ensureClusterEntity(client, jobId, cluster, 'case', async () => {
    const caseTypeName = inferCaseTypeName(cluster);
    const caseStatusName = inferCaseStatusName(cluster);
    const caseTypeId = await getCaseTypeId(client, caseTypeName);
    const caseStatusId = await getCaseStatusId(client, caseStatusName);
    const caseNumber = `CBIS-${cluster.clusterId.replace(/[^a-z0-9]/gi, '').slice(-12).toUpperCase()}`;

    const row = await client.query<{ id: string }>(
      `INSERT INTO cases (
         case_number, contact_id, case_type_id, status_id, title, description, source,
         referral_source, intake_date, opened_date, closed_date, custom_data, tags,
         client_viewable, is_urgent, requires_followup, created_by, modified_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                 COALESCE($9::timestamptz, NOW()),
                 $10::timestamptz,
                 $11::timestamptz,
                 $12::jsonb,
                 $13::text[],
                 false,
                 false,
                 true,
                 $14,
                 $15)
       RETURNING id`,
      [
        caseNumber,
        contactId,
        caseTypeId,
        caseStatusId,
        cluster.primaryLabel,
        `CBIS import cluster ${cluster.clusterId}\nRecord type: ${cluster.recordType}\nSource tables: ${cluster.sourceTables.join(' | ')}`,
        cluster.primarySourceTable || 'cbis_unified',
        cluster.linkBasis.join(' | ') || null,
        cluster.firstSeenDate,
        cluster.firstSeenDate,
        cluster.lastSeenDate,
        toJson({
          cluster_id: cluster.clusterId,
          source_tables: cluster.sourceTables,
          source_row_ids: cluster.sourceRowIds,
          participant_ids: cluster.participantIds,
          link_confidence: cluster.linkConfidence,
          source_type_breakdown: cluster.sourceTypeBreakdown,
        }),
        [cluster.recordType, 'cbis_import'],
        userId,
        userId,
      ]
    );

    return row.rows[0].id;
  });
};

const createEventFromCluster = async (
  client: PoolClient,
  jobId: string,
  cluster: CbisClusterSummary,
  userId: string | null
): Promise<string> => {
  return ensureClusterEntity(client, jobId, cluster, 'event', async () => {
    const startDate = cluster.firstSeenDate ?? cluster.lastSeenDate ?? new Date().toISOString().slice(0, 10);
    const endDate = cluster.lastSeenDate ?? cluster.firstSeenDate ?? startDate;
    const row = await client.query<{ id: string }>(
      `INSERT INTO events (
         name, description, event_type, start_date, end_date, location_name,
         status, is_public, created_by, modified_by
       ) VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, false, $8::uuid, $9::uuid)
       RETURNING id`,
      [
        cluster.primaryLabel,
        `CBIS import cluster ${cluster.clusterId}\nSource tables: ${cluster.sourceTables.join(' | ')}`,
        cluster.recordType,
        startDate,
        endDate,
        choosePrimaryValue(cluster.allAddresses),
        'planned',
        userId,
        userId,
      ]
    );

    return row.rows[0].id;
  });
};

const createVolunteerFromCluster = async (
  client: PoolClient,
  jobId: string,
  cluster: CbisClusterSummary,
  contactId: string,
  userId: string | null
): Promise<string> => {
  return ensureClusterEntity(client, jobId, cluster, 'volunteer', async () => {
    const row = await client.query<{ id: string }>(
      `INSERT INTO volunteers (
         contact_id, volunteer_status, skills, availability, emergency_contact_name,
         emergency_contact_phone, hours_contributed, created_by, modified_by
       ) VALUES ($1::uuid, 'active', $2::text[], $3, $4, $5, 0, $6::uuid, $7::uuid)
       RETURNING id`,
      [
        contactId,
        cluster.sourceTables.filter((table) => table.includes('volunteer') || table.includes('staff')),
        `CBIS import cluster ${cluster.clusterId}`,
        null,
        null,
        userId,
        userId,
      ]
    );

    return row.rows[0].id;
  });
};

const createPersonContextFromCluster = async (
  client: PoolClient,
  jobId: string,
  cluster: CbisClusterSummary,
  userId: string | null
): Promise<{ contactId: string; caseId: string }> => {
  const contactId = await createContactFromCluster(client, jobId, cluster, userId);
  const caseId = await createCaseFromCluster(client, jobId, cluster, contactId, userId);
  return { contactId, caseId };
};

const addNote = async (
  client: PoolClient,
  entityType: 'contact' | 'case',
  entityId: string,
  subject: string,
  content: string,
  isInternal: boolean,
  isImportant: boolean,
  userId: string | null
): Promise<string> => {
  if (entityType === 'case') {
    const row = await client.query<{ id: string }>(
      `INSERT INTO case_notes (
         case_id, note_type, subject, content, is_internal, is_important, created_by
       ) VALUES ($1::uuid, 'note', $2, $3, $4::boolean, $5::boolean, $6::uuid)
       RETURNING id`,
      [entityId, subject, content, isInternal, isImportant, userId]
    );
    return row.rows[0].id;
  }

  const row = await client.query<{ id: string }>(
    `INSERT INTO contact_notes (
       contact_id, note_type, subject, content, is_internal, is_important, created_by
     ) VALUES ($1::uuid, 'note', $2, $3, $4::boolean, $5::boolean, $6::uuid)
     RETURNING id`,
    [entityId, subject, content, isInternal, isImportant, userId]
  );
  return row.rows[0].id;
};

const addActivity = async (
  client: PoolClient,
  subject: string,
  description: string,
  regardingType: 'contact' | 'account' | 'case' | 'event',
  regardingId: string,
  userId: string | null
): Promise<string> => {
  const row = await client.query<{ id: string }>(
    `INSERT INTO activities (
       activity_type, subject, description, activity_date, regarding_type, regarding_id, created_by
     ) VALUES ($1, $2, $3, NOW(), $4, $5::uuid, $6::uuid)
     RETURNING id`,
    ['note', subject, description, regardingType, regardingId, userId]
  );
  return row.rows[0].id;
};

const addCaseService = async (
  client: PoolClient,
  caseId: string,
  serviceName: string,
  serviceDate: string,
  notes: string,
  userId: string | null
): Promise<string> => {
  const row = await client.query<{ id: string }>(
    `INSERT INTO case_services (
       case_id, service_name, service_type, service_date, status, notes, created_by
     ) VALUES ($1::uuid, $2, $3, $4::date, 'completed', $5, $6::uuid)
     RETURNING id`,
    [caseId, serviceName, 'other', serviceDate, notes, userId]
  );
  return row.rows[0].id;
};

const addCaseMilestone = async (
  client: PoolClient,
  caseId: string,
  milestoneName: string,
  description: string,
  dueDate: string | null,
  isCompleted: boolean,
  userId: string | null
): Promise<string> => {
  const row = await client.query<{ id: string }>(
    `INSERT INTO case_milestones (
       case_id, milestone_name, description, due_date, is_completed, created_by
     ) VALUES ($1::uuid, $2, $3, $4::date, $5::boolean, $6::uuid)
     RETURNING id`,
    [caseId, milestoneName, description, dueDate, isCompleted, userId]
  );
  return row.rows[0].id;
};

const addFollowUp = async (
  client: PoolClient,
  organizationId: string,
  caseId: string,
  title: string,
  description: string,
  scheduledDate: string,
  scheduledTime: string | null,
  method: string | null,
  userId: string | null
): Promise<string> => {
  const row = await client.query<{ id: string }>(
    `INSERT INTO follow_ups (
       organization_id, entity_type, entity_id, title, description, scheduled_date,
       scheduled_time, method, status, created_by, modified_by
     ) VALUES ($1::uuid, 'case', $2::uuid, $3, $4, $5::date, $6::time, $7, 'scheduled', $8::uuid, $9::uuid)
     RETURNING id`,
    [organizationId, caseId, title, description, scheduledDate, scheduledTime, method, userId, userId]
  );
  return row.rows[0].id;
};

const addDonation = async (
  client: PoolClient,
  contactId: string | null,
  accountId: string | null,
  amount: number,
  donationDate: string,
  paymentMethod: string | null,
  campaignName: string | null,
  notes: string | null,
  isRecurring: boolean,
  userId: string | null
): Promise<string> => {
  const row = await client.query<{ id: string }>(
    `INSERT INTO donations (
       contact_id, account_id, amount, donation_date, payment_method, payment_status,
       campaign_name, notes, is_recurring, created_by, modified_by
     ) VALUES ($1::uuid, $2::uuid, $3, $4::timestamptz, $5, 'completed', $6, $7, $8::boolean, $9::uuid, $10::uuid)
     RETURNING id`,
    [contactId, accountId, amount, donationDate, paymentMethod, campaignName, notes, isRecurring, userId, userId]
  );
  return row.rows[0].id;
};

const pairOrganizationId = async (client: PoolClient, accountId?: string, contactId?: string): Promise<string> => {
  if (accountId) {
    return accountId;
  }
  if (contactId) {
    const result = await client.query<{ account_id: string | null }>(
      'SELECT account_id FROM contacts WHERE id = $1 LIMIT 1',
      [contactId]
    );
    if (result.rows[0]?.account_id) {
      return result.rows[0].account_id;
    }
  }

  const fallback = await client.query<{ id: string }>('SELECT id FROM accounts ORDER BY created_at ASC LIMIT 1');
  if (fallback.rows[0]?.id) {
    return fallback.rows[0].id;
  }

    const createdFallback = await client.query<{ id: string }>(
      `INSERT INTO accounts (
         account_name, account_type, description, is_active, created_by, modified_by
     ) VALUES (
       'CBIS Import Organization',
       'organization',
       'Fallback organization anchor created during the CBIS unified dataset import',
       true,
       NULL,
       NULL
     )
       RETURNING id`
  );

  if (createdFallback.rows[0]?.id) {
    return createdFallback.rows[0].id;
  }

  throw new Error('CBIS import requires at least one account to anchor follow-ups');
};

const importClusterRows = async (
  client: PoolClient,
  jobId: string,
  cluster: CbisClusterSummary,
  rows: SourceRow[],
  entityContext: EntityContext,
  userId: string | null,
  organizationId: string
): Promise<{ processed: number; skipped: number; importedByType: Record<string, number> }> => {
  let processed = 0;
  let skipped = 0;
  const importedByType: Record<string, number> = {};

  const increment = (key: string): void => {
    importedByType[key] = (importedByType[key] ?? 0) + 1;
  };

  for (const row of rows) {
    const staged = await upsertSourceRow(client, jobId, row);
    if (staged.status === 'processed' && staged.targetEntityId) {
      skipped += 1;
      continue;
    }

    const table = row.sourceTable;
    const summary = summarizeRow(
      row.values,
      [
        'notes',
        'case_notes',
        'service_notes',
        'enrollment_notes',
        'referral_notes',
        'internal_referral_notes',
        'goal',
        'objectives',
        'plan_title',
        'narrative_summary_of_plan',
        'service_provided',
        'services_provided',
        'date_of_contact',
      ],
      `${table} row ${row.sourceRowId}`
    );

    const rowDate =
      parseFlexibleDate(
        row.values.date_of_donation ??
          row.values.date_of_contact ??
          row.values.date ??
          row.values.date_of_service ??
          row.values.start_date ??
          row.values.interview_date ??
          row.values.start_date ??
          row.values.goal_start_date ??
          row.values.date_of_intake_planning ??
          row.values.date_of_intake
      ) ?? cluster.firstSeenDate ?? null;

    const rowTime = parseFlexibleTime(row.values.time_in ?? row.values.start_time ?? row.values.time_of_day ?? null);

    try {
      if (table === 'donation') {
        const amount = Number.parseFloat(row.values.amount ?? '');
        if (Number.isFinite(amount) && amount > 0) {
          const donationId = await addDonation(
            client,
            entityContext.contactId ?? null,
            entityContext.accountId ?? null,
            amount,
            parseFlexibleDate(row.values.date_of_donation) ?? rowDate ?? new Date().toISOString().slice(0, 10),
            row.values.type_of_donation ?? row.values.payment_method ?? null,
            row.values.program_to_be_used_for ?? row.values.campaign_name ?? null,
            row.values.in_kind_description ?? summary,
            row.values.sent_thank_you?.toLowerCase() === 'yes' || row.values.sent_receipt?.toLowerCase() === 'yes',
            userId
          );
          await markSourceRowProcessed(client, row, 'donation', donationId, 'processed');
          processed += 1;
          increment('donation');
          continue;
        }
      }

      if (table === 'contact_log' || table === 'client_notes_and_stats' || table === 'full_intake') {
        const entityType = entityContext.caseId ? 'case' : 'contact';
        const entityId = entityContext.caseId ?? entityContext.contactId ?? '';
        if (entityId) {
          const noteId = await addNote(
            client,
            entityType,
            entityId,
            cluster.primaryLabel,
            summary,
            table === 'client_notes_and_stats' || table === 'full_intake',
            false,
            userId
          );
          await markSourceRowProcessed(client, row, entityType === 'case' ? 'note' : 'contact_note', noteId, 'processed');
          processed += 1;
          increment(entityType === 'case' ? 'case_note' : 'contact_note');
          continue;
        }
      }

      if (table === 'program_attendance') {
        const activityTargetId = entityContext.contactId ?? entityContext.caseId ?? null;
        if (activityTargetId) {
          const regardingType: 'contact' | 'case' = entityContext.contactId ? 'contact' : 'case';
          const activityId = await addActivity(
            client,
            row.values.program_name ?? row.values.class_name ?? cluster.primaryLabel,
            summary,
            regardingType,
            activityTargetId,
            userId
          );
          await markSourceRowProcessed(client, row, 'activity', activityId, 'processed');
          processed += 1;
          increment('activity');
          continue;
        }
      }

      if (table === 'class_profile') {
        const eventId = entityContext.eventId ?? (await createEventFromCluster(client, jobId, cluster, userId));
        const activityId = await addActivity(
          client,
          row.values.class_name ?? cluster.primaryLabel,
          summary,
          'event',
          eventId,
          userId
        );
        await markSourceRowProcessed(client, row, 'activity', activityId, 'processed');
        processed += 1;
        increment('activity');
        continue;
      }

      if (table === 'participant' || table === 'client' || table === 'client_lead') {
        const noteId = await addNote(
          client,
          entityContext.caseId ? 'case' : 'contact',
          entityContext.caseId ?? entityContext.contactId ?? '',
          cluster.primaryLabel,
          summary,
          false,
          table === 'client_lead',
          userId
        );
        await markSourceRowProcessed(client, row, entityContext.caseId ? 'note' : 'contact', noteId, 'processed');
        processed += 1;
        increment(entityContext.caseId ? 'case_note' : 'contact_note');
        continue;
      }

      if (table === 'client_activity' || table === 'staff_activity') {
        if (entityContext.caseId) {
          const noteId = await addNote(client, 'case', entityContext.caseId, cluster.primaryLabel, summary, true, false, userId);
          await markSourceRowProcessed(client, row, 'note', noteId, 'processed');
          processed += 1;
          increment('case_note');
          continue;
        }
      }

      if (table === 'contact' || table === 'case_note' || table === 'notes' || table === 'counselling') {
        if (entityContext.caseId) {
          const noteId = await addNote(client, 'case', entityContext.caseId, cluster.primaryLabel, summary, false, false, userId);
          await markSourceRowProcessed(client, row, 'note', noteId, 'processed');
          processed += 1;
          increment('case_note');
          continue;
        }
        if (entityContext.contactId) {
          const noteId = await addNote(client, 'contact', entityContext.contactId, cluster.primaryLabel, summary, false, false, userId);
          await markSourceRowProcessed(client, row, 'note', noteId, 'processed');
          processed += 1;
          increment('contact_note');
          continue;
        }
      }

      if (table === 'services') {
        if (entityContext.caseId) {
          const serviceId = await addCaseService(
            client,
            entityContext.caseId,
            row.values.services_provided ?? row.values.service_provided ?? row.values.service_program ?? cluster.primaryLabel,
            rowDate ?? new Date().toISOString().slice(0, 10),
            summary,
            userId
          );
          await markSourceRowProcessed(client, row, 'service', serviceId, 'processed');
          processed += 1;
          increment('case_service');
          continue;
        }
      }

      if (table === 'goals') {
        if (entityContext.caseId) {
          const milestoneId = await addCaseMilestone(
            client,
            entityContext.caseId,
            row.values.goal ?? cluster.primaryLabel,
            summarizeRow(row.values, ['objectives', 'reason_goal_was_abandoned'], summary),
            parseFlexibleDate(row.values.target_date),
            row.values.goal_status?.toLowerCase() === 'completed',
            userId
          );
          await markSourceRowProcessed(client, row, 'milestone', milestoneId, 'processed');
          processed += 1;
          increment('case_milestone');
          continue;
        }
      }

      if (
        table === 'individual_service_plan' ||
        table === 'full_screening_initial_data' ||
        table === 'pre_screening_form' ||
        table === 'self_sufficiency_matrix' ||
        table === 'retention_tracking' ||
        table === 'background_check' ||
        table === 'benefits' ||
        table === 'household' ||
        table === 'income_and_expenses' ||
        table === 'moca' ||
        table === 'incident_report' ||
        table === 'hospitalization'
      ) {
        if (entityContext.caseId) {
          const noteId = await addNote(
            client,
            'case',
            entityContext.caseId,
            cluster.primaryLabel,
            summary,
            true,
            table === 'incident_report' || table === 'hospitalization',
            userId
          );
          await markSourceRowProcessed(client, row, 'note', noteId, 'processed');
          processed += 1;
          increment('case_note');
          continue;
        }
      }

      if (table === 'referral' || table === 'client_referral' || table === 'inquiry_brief_services') {
        if (entityContext.caseId) {
          const followUpId = await addFollowUp(
            client,
            organizationId,
            entityContext.caseId,
            row.values.service_inquiry ?? row.values.referral_type ?? cluster.primaryLabel,
            summary,
            rowDate ?? new Date().toISOString().slice(0, 10),
            rowTime,
            row.values.staff_contact === 'email' ? 'email' : row.values.phone_number ? 'phone' : null,
            userId
          );
          await markSourceRowProcessed(client, row, 'follow_up', followUpId, 'processed');
          processed += 1;
          increment('follow_up');
          continue;
        }
      }

      if (table === 'class_attendance') {
        if (entityContext.contactId) {
          const activityId = await addActivity(
            client,
            row.values.class_name ?? cluster.primaryLabel,
            summary,
            'contact',
            entityContext.contactId,
            userId
          );
          await markSourceRowProcessed(client, row, 'activity', activityId, 'processed');
          processed += 1;
          increment('activity');
          continue;
        }
      }

      const fallbackTarget = entityContext.caseId ?? entityContext.contactId ?? entityContext.accountId ?? entityContext.eventId ?? null;
      await markSourceRowProcessed(client, row, 'activity', fallbackTarget, 'skipped', []);
      skipped += 1;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      logger.warn('CBIS source row import fallback failed', {
        table,
        rowId: row.sourceRowId,
        clusterId: cluster.clusterId,
        error,
        errorMessage,
        errorDetail:
          error && typeof error === 'object' && 'detail' in error ? (error as { detail?: string }).detail : null,
        errorHint: error && typeof error === 'object' && 'hint' in error ? (error as { hint?: string }).hint : null,
      });
      const fallbackTarget = entityContext.caseId ?? entityContext.contactId ?? entityContext.accountId ?? entityContext.eventId ?? null;
      await markSourceRowProcessed(client, row, 'activity', fallbackTarget, 'failed', [
        errorMessage,
      ]);
      skipped += 1;
    }
  }

  return { processed, skipped, importedByType };
};

export const runCbisUnifiedImport = async (
  database: Pool = pool,
  options: CbisUnifiedImportOptions
): Promise<CbisUnifiedImportReport> => {
  const metadataPath = path.join(options.sourceDir, 'cbis_unified_metadata.json');
  logger.info('CBIS import starting', { sourceDir: options.sourceDir, dryRun: Boolean(options.dryRun) });
  const metadata = readJsonFile<MetadataFile>(metadataPath);
  logger.info('CBIS import metadata loaded', {
    sourceCount: Object.keys(metadata.source_file_map ?? {}).length,
    sourceRowCount: metadata.source_row_count ?? null,
    masterRowCount: metadata.master_row_count ?? null,
  });
  logger.info('CBIS import loading master clusters');
  const { summaries: masterClusters, sourceRowIdToClusterId, uniqueClusterCount } = loadMasterClusters(options.sourceDir);
  logger.info('CBIS import master clusters loaded', {
    uniqueClusterCount,
    summaryCount: masterClusters.length,
  });
  const sourceDefinitions = getSourceDefinitions(metadata);
  logger.info('CBIS import source definitions prepared', { sourceDefinitions: sourceDefinitions.length });
  const sourceRows: SourceRow[] = [];

  for (const definition of sourceDefinitions) {
    logger.info('CBIS import loading source file', {
      sourceTable: definition.sourceTable,
      sourceFile: definition.sourceFileRef,
      sourceKind: definition.sourceKind,
    });
    const rows = await loadSourceRows(options.sourceDir, definition);
    logger.info('CBIS import source file loaded', {
      sourceTable: definition.sourceTable,
      sourceFile: definition.sourceFileRef,
      rowCount: rows.length,
    });
    for (const row of rows) {
      const clusterId =
        sourceRowIdToClusterId.get(row.parentSourceRowId ?? row.sourceRowId) ??
        sourceRowIdToClusterId.get(row.sourceRowId) ??
        null;
      sourceRows.push({
        ...row,
        clusterId,
        recordType: definition.sourceRole,
      });
    }
  }

  const sourceRowsByCluster = new Map<string, SourceRow[]>();
  logger.info('CBIS import grouping source rows by cluster', { sourceRowCount: sourceRows.length });
  for (const row of sourceRows) {
    if (!row.clusterId) {
      continue;
    }
    const existing = sourceRowsByCluster.get(row.clusterId) ?? [];
    existing.push(row);
    sourceRowsByCluster.set(row.clusterId, existing);
  }

  const imported: Record<string, number> = {};
  const incrementImported = (key: string, amount = 1): void => {
    imported[key] = (imported[key] ?? 0) + amount;
  };
  const unresolvedClusters: CbisClusterSummary[] = [];
  const unresolvedByRecordType: Record<string, number> = {};
  const unresolvedBySourceTable: Record<string, number> = {};

  const client = await database.connect();
  const warnings: string[] = [];
  const jobSummary: CbisUnifiedImportReport = {
    sourceDir: options.sourceDir,
    dryRun: Boolean(options.dryRun),
    sourceRowCount: metadata.source_row_count ?? sourceRows.length,
    masterRowCount: metadata.master_row_count ?? masterClusters.length,
    uniqueClusterCount,
    imported,
    stagedRows: 0,
    processedRows: 0,
    skippedRows: 0,
    unresolvedRows: 0,
    unresolvedClusters: [],
    unresolvedByRecordType,
    unresolvedBySourceTable,
    warnings,
  };

  let jobId = '';

  try {
    await client.query('BEGIN');

    const jobResult = await client.query<{ id: string }>(
      `INSERT INTO cbis_import_jobs (
         source_dir, source_manifest, dry_run, status, created_by
       ) VALUES ($1, $2::jsonb, $3, $4, $5)
       RETURNING id`,
      [
        options.sourceDir,
        toJson({
          metadata_path: metadataPath,
          source_row_count: metadata.source_row_count ?? sourceRows.length,
          master_row_count: metadata.master_row_count ?? masterClusters.length,
          cluster_count: metadata.cluster_count ?? uniqueClusterCount,
          source_count: Object.keys(metadata.source_file_map ?? {}).length,
        }),
        Boolean(options.dryRun),
        options.dryRun ? 'dry_run' : 'running',
        options.actorUserId ?? DEFAULT_USER_ID,
      ]
    );
    jobId = jobResult.rows[0].id;

    for (const row of sourceRows) {
      await upsertSourceRow(client, jobId, row);
      jobSummary.stagedRows += 1;
    }

    logger.info('CBIS import staging complete', { stagedRows: jobSummary.stagedRows });
    for (const cluster of masterClusters) {
      if (jobSummary.processedRows % 250 === 0) {
        logger.info('CBIS import cluster progress', {
          processedRows: jobSummary.processedRows,
          skippedRows: jobSummary.skippedRows,
          unresolvedRows: jobSummary.unresolvedRows,
          clusterId: cluster.clusterId,
        });
      }
      const clusterRows = sourceRowsByCluster.get(cluster.clusterId) ?? [];
      const personLike =
        cluster.recordType === 'participant' || cluster.recordType === 'client' || cluster.recordType === 'client_lead';
      const staffLike = cluster.recordType === 'staff' || cluster.recordType === 'staff_activity';
      const orgLike = cluster.recordType === 'org';
      const eventLike = cluster.recordType === 'event';

      const context: EntityContext = { cluster };

      if (personLike) {
        const personContext = await createPersonContextFromCluster(
          client,
          jobId,
          cluster,
          options.actorUserId ?? DEFAULT_USER_ID
        );
        context.contactId = personContext.contactId;
        context.caseId = personContext.caseId;
        if (cluster.sourceTables.some((table) => table.toLowerCase().includes('volunteer'))) {
          context.volunteerId = await createVolunteerFromCluster(
            client,
            jobId,
            cluster,
            context.contactId,
            options.actorUserId ?? DEFAULT_USER_ID
          );
        }
      } else if (
        cluster.recordType === 'client_activity' ||
        (cluster.recordType === 'other' && cluster.sourceTables.some((table) => table.toLowerCase().includes('full intake')))
      ) {
        const personContext = await createPersonContextFromCluster(
          client,
          jobId,
          cluster,
          options.actorUserId ?? DEFAULT_USER_ID
        );
        context.contactId = personContext.contactId;
        context.caseId = personContext.caseId;
      } else if (
        cluster.recordType === 'reference' &&
        cluster.sourceTables.some((table) => table.toLowerCase().includes('class profile'))
      ) {
        context.eventId = await createEventFromCluster(client, jobId, cluster, options.actorUserId ?? DEFAULT_USER_ID);
      } else if (staffLike) {
        context.contactId = await createContactFromCluster(client, jobId, cluster, options.actorUserId ?? DEFAULT_USER_ID);
      } else if (orgLike) {
        context.accountId = await createAccountFromCluster(client, jobId, cluster, options.actorUserId ?? DEFAULT_USER_ID);
        const contactCandidate = choosePrimaryValue([...cluster.allNames, cluster.primaryLabel]);
        if (contactCandidate) {
          context.contactId = await ensureClusterEntity(client, jobId, cluster, 'contact', async () => {
            const { firstName, lastName } = splitHumanName(contactCandidate);
            const row = await client.query<{ id: string }>(
              `INSERT INTO contacts (
                 account_id, first_name, last_name, email, phone, notes, is_active, created_by, modified_by
               ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
               RETURNING id`,
              [
                context.accountId,
                firstName,
                lastName,
                choosePrimaryValue(cluster.allEmails),
                choosePrimaryValue(cluster.allPhones),
                `CBIS organization contact for ${cluster.primaryLabel}`,
                options.actorUserId ?? DEFAULT_USER_ID,
                options.actorUserId ?? DEFAULT_USER_ID,
              ]
            );
            return row.rows[0].id;
          });
        }
      } else if (eventLike) {
        context.eventId = await createEventFromCluster(client, jobId, cluster, options.actorUserId ?? DEFAULT_USER_ID);
      } else {
        jobSummary.unresolvedRows += cluster.sourceRowCount;
        unresolvedClusters.push(cluster);
        unresolvedByRecordType[cluster.recordType] = (unresolvedByRecordType[cluster.recordType] ?? 0) + cluster.sourceRowCount;
        for (const table of cluster.sourceTables) {
          unresolvedBySourceTable[table] = (unresolvedBySourceTable[table] ?? 0) + cluster.sourceRowCount;
        }
      }

      if ((cluster.recordType === 'client_activity' || cluster.recordType === 'client_lead' || cluster.recordType === 'staff_activity') && !context.contactId) {
        const participantSourceId = cluster.participantIds[0];
        if (participantSourceId) {
          const participantClusterId = sourceRowIdToClusterId.get(participantSourceId);
          if (participantClusterId) {
            const participantCluster = masterClusters.find((candidate) => candidate.clusterId === participantClusterId);
            if (participantCluster) {
              context.contactId = await createContactFromCluster(
                client,
                jobId,
                participantCluster,
                options.actorUserId ?? DEFAULT_USER_ID
              );
              context.caseId = await createCaseFromCluster(
                client,
                jobId,
                participantCluster,
                context.contactId,
                options.actorUserId ?? DEFAULT_USER_ID
              );
            }
          }
        }
      }

      const organizationId = await pairOrganizationId(client, context.accountId, context.contactId);
      const result = await importClusterRows(
        client,
        jobId,
        cluster,
        clusterRows,
        context,
        options.actorUserId ?? DEFAULT_USER_ID,
        organizationId
      );

      jobSummary.processedRows += result.processed;
      jobSummary.skippedRows += result.skipped;
      for (const [key, value] of Object.entries(result.importedByType)) {
        incrementImported(key, value);
      }
    }

    logger.info('CBIS import cluster processing complete', {
      processedRows: jobSummary.processedRows,
      skippedRows: jobSummary.skippedRows,
      unresolvedRows: jobSummary.unresolvedRows,
    });
    jobSummary.unresolvedClusters = unresolvedClusters
      .sort((left, right) => right.sourceRowCount - left.sourceRowCount)
      .slice(0, 50)
      .map((cluster) => ({
        clusterId: cluster.clusterId,
        recordType: cluster.recordType,
        primaryLabel: cluster.primaryLabel,
        sourceTables: cluster.sourceTables,
        sourceRowCount: cluster.sourceRowCount,
      }));
    await client.query(
      `UPDATE cbis_import_jobs
       SET status = $2, summary = $3::jsonb, completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [jobId, options.dryRun ? 'dry_run' : 'completed', toJson(jobSummary)]
    );

    if (options.dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    if (options.reportPath) {
      fs.writeFileSync(options.reportPath, `${JSON.stringify(jobSummary, null, 2)}\n`, 'utf8');
    }

    return jobSummary;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.warn('CBIS import rollback failed', { rollbackError });
    }

    if (jobId && !options.dryRun) {
      await database.query(
        `UPDATE cbis_import_jobs
         SET status = 'failed', error_message = $2, completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [jobId, error instanceof Error ? error.message : 'Unknown CBIS import failure']
      );
    }

    throw error;
  } finally {
    client.release();
  }
};

export const cbisUnifiedImport = {
  run: runCbisUnifiedImport,
};
