import fs from 'fs';
import path from 'path';
import type { Pool } from 'pg';

interface ImportOptions {
  sourceDir: string;
  dryRun: boolean;
  reportPath?: string;
  actorUserId?: string | null;
}

interface CsvRow {
  [key: string]: string;
}

interface NormalizedBundleSummary {
  generated_at?: string;
  schema_bundle_path?: string;
  schema_bundle_version?: string;
  entity_status_counts?: Record<string, Record<string, number>>;
  entity_output_files?: Record<string, string>;
  mapping_row_count?: number;
  gap_row_count?: number;
  unsupported_targets?: Record<string, string>;
}

interface StagedSourceRow {
  source_file: string;
  source_table: string;
  source_row_id: string;
  source_row_number: number;
  cluster_id: string | null;
  record_type: string | null;
  mappings: CsvRow[];
}

interface ImportReport {
  sourceDir: string;
  normalizedSourceDir: string;
  dryRun: boolean;
  schemaBundleVersion: string | null;
  stagedRows: number;
  unresolvedRows: number;
  readyRows: number;
  groupedSourceRows: number;
  targetCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  imported: Record<string, number>;
  sourceManifest: Record<string, unknown>;
  warnings: string[];
  reportPath?: string;
  jobId?: string | null;
}

const SUMMARY_FILENAME = 'cbis_import_summary.json';
const ENTITY_MAP_FILENAME = 'cbis_import_entity_map.csv';

const PRIMARY_TARGET_ORDER = [
  'donation',
  'follow_up',
  'event',
  'case',
  'contact',
  'account',
  'activity',
  'event_registration',
];

const STAGING_TARGET_TYPES = new Set([
  'account',
  'contact',
  'case',
  'event',
  'volunteer',
  'donation',
  'note',
  'service',
  'milestone',
  'follow_up',
  'activity',
]);

function resolveNormalizedSourceDir(sourceDir: string): string {
  const direct = path.resolve(sourceDir);
  const directSummary = path.join(direct, SUMMARY_FILENAME);
  if (fs.existsSync(directSummary)) {
    return direct;
  }

  const nested = path.join(direct, 'normalized_candidate_bundle');
  const nestedSummary = path.join(nested, SUMMARY_FILENAME);
  if (fs.existsSync(nestedSummary)) {
    return nested;
  }

  throw new Error(
    `Could not find ${SUMMARY_FILENAME} in ${direct} or ${nested}. Run the CBIS normalized bundle builder first.`
  );
}

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some((value) => value !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((value) => value !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((row) => {
    const output: CsvRow = {};
    headers.forEach((header, columnIndex) => {
      output[header] = row[columnIndex] ?? '';
    });
    return output;
  });
}

function readCsvFile(filePath: string): CsvRow[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function targetPriority(targetEntityType: string): number {
  const index = PRIMARY_TARGET_ORDER.indexOf(targetEntityType);
  return index >= 0 ? index : PRIMARY_TARGET_ORDER.length;
}

function statusPriority(targetRowStatus: string): number {
  switch (targetRowStatus) {
    case 'ready':
      return 0;
    case 'review_required':
      return 1;
    case 'invalid':
      return 2;
    default:
      return 3;
  }
}

function choosePrimaryMapping(mappings: CsvRow[]): CsvRow | null {
  const withTarget = mappings.filter((row) => row.target_entity_type);
  if (withTarget.length === 0) {
    return null;
  }

  return withTarget.sort((left, right) => {
    const leftStatus = statusPriority(left.target_row_status ?? '');
    const rightStatus = statusPriority(right.target_row_status ?? '');
    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
    }
    const leftTarget = targetPriority(left.target_entity_type ?? '');
    const rightTarget = targetPriority(right.target_entity_type ?? '');
    if (leftTarget !== rightTarget) {
      return leftTarget - rightTarget;
    }
    return String(left.target_entity_type ?? '').localeCompare(String(right.target_entity_type ?? ''));
  })[0];
}

function mapSourceStatusToStagingStatus(targetRowStatus: string): 'staged' | 'processed' | 'skipped' | 'failed' {
  if (targetRowStatus === 'ready') {
    return 'staged';
  }
  if (targetRowStatus === 'invalid') {
    return 'failed';
  }
  if (targetRowStatus === 'review_required') {
    return 'skipped';
  }
  return 'skipped';
}

function normalizeStagingTargetType(targetEntityType: string): string | null {
  return STAGING_TARGET_TYPES.has(targetEntityType) ? targetEntityType : null;
}

function groupMappingsBySourceRow(mappingRows: CsvRow[]): StagedSourceRow[] {
  const grouped = new Map<string, StagedSourceRow>();

  for (const row of mappingRows) {
    const key = [row.source_file, row.source_table, row.source_row_id].join('::');
    const existing = grouped.get(key);
    if (existing) {
      existing.mappings.push(row);
      continue;
    }

    grouped.set(key, {
      source_file: row.source_file ?? '',
      source_table: row.source_table ?? '',
      source_row_id: row.source_row_id ?? '',
      source_row_number: Number.parseInt(row.source_row_number ?? '0', 10) || 0,
      cluster_id: row.cluster_id ? row.cluster_id : null,
      record_type: row.cluster_record_type ? row.cluster_record_type : null,
      mappings: [row],
    });
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const tableCompare = left.source_table.localeCompare(right.source_table);
    if (tableCompare !== 0) {
      return tableCompare;
    }
    return left.source_row_number - right.source_row_number;
  });
}

function buildReport(summary: NormalizedBundleSummary, groupedRows: StagedSourceRow[], sourceDir: string, normalizedSourceDir: string, dryRun: boolean): ImportReport {
  const targetCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  let unresolvedRows = 0;
  let readyRows = 0;
  const warnings: string[] = [];

  for (const groupedRow of groupedRows) {
    const primary = choosePrimaryMapping(groupedRow.mappings);
    const primaryStatus = primary?.target_row_status ?? 'skipped';
    statusCounts[primaryStatus] = (statusCounts[primaryStatus] ?? 0) + 1;
    if (primaryStatus === 'ready') {
      readyRows += 1;
    } else {
      unresolvedRows += 1;
    }

    if (primary?.target_entity_type) {
      targetCounts[primary.target_entity_type] = (targetCounts[primary.target_entity_type] ?? 0) + 1;
      if (!normalizeStagingTargetType(primary.target_entity_type)) {
        const warning = `unsupported_staging_target:${primary.target_entity_type}`;
        if (!warnings.includes(warning)) {
          warnings.push(warning);
        }
      }
    }
  }

  return {
    sourceDir,
    normalizedSourceDir,
    dryRun,
    schemaBundleVersion: summary.schema_bundle_version ?? null,
    stagedRows: groupedRows.length,
    unresolvedRows,
    readyRows,
    groupedSourceRows: groupedRows.length,
    targetCounts,
    statusCounts,
    imported: {},
    sourceManifest: {
      generated_at: summary.generated_at ?? null,
      schema_bundle_path: summary.schema_bundle_path ?? null,
      normalized_source_dir: normalizedSourceDir,
      entity_output_files: summary.entity_output_files ?? {},
      entity_status_counts: summary.entity_status_counts ?? {},
      mapping_row_count: summary.mapping_row_count ?? 0,
      gap_row_count: summary.gap_row_count ?? 0,
      unsupported_targets: summary.unsupported_targets ?? {},
    },
    warnings,
  };
}

async function stageSourceRows(
  pool: Pool,
  requestedSourceDir: string,
  normalizedSourceDir: string,
  groupedRows: StagedSourceRow[],
  report: ImportReport,
  actorUserId: string | null | undefined
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const jobResult = await client.query<{ id: string }>(
      `INSERT INTO cbis_import_jobs (
         source_dir,
         source_manifest,
         dry_run,
         status,
         summary,
         created_by
       ) VALUES ($1, $2::jsonb, $3, 'running', '{}'::jsonb, $4)
       RETURNING id`,
      [
        requestedSourceDir,
        JSON.stringify(report.sourceManifest),
        false,
        actorUserId ?? null,
      ]
    );

    const jobId = jobResult.rows[0]?.id;
    if (!jobId) {
      throw new Error('Failed to create cbis_import_jobs row');
    }

    for (const groupedRow of groupedRows) {
      const primary = choosePrimaryMapping(groupedRow.mappings);
      const targetEntityType = primary?.target_entity_type ?? '';
      const stagingTargetType = normalizeStagingTargetType(targetEntityType);
      const targetEntityId = primary?.target_entity_id ?? '';
      const warnings = groupedRow.mappings
        .flatMap((row) => [row.derivation_reason, row.validation_warnings, row.validation_errors])
        .filter((value): value is string => Boolean(value && value.trim()));

      const payload = {
        normalized_source_dir: normalizedSourceDir,
        source: {
          source_file: groupedRow.source_file,
          source_table: groupedRow.source_table,
          source_row_id: groupedRow.source_row_id,
          source_row_number: groupedRow.source_row_number,
          cluster_id: groupedRow.cluster_id,
          record_type: groupedRow.record_type,
        },
        primary_mapping: primary ?? null,
        mappings: groupedRow.mappings,
      };

      await client.query(
        `INSERT INTO cbis_import_source_rows (
           job_id,
           source_table,
           source_file,
           source_row_id,
           source_row_number,
           cluster_id,
           record_type,
           row_payload,
           target_entity_type,
           target_entity_id,
           status,
           warnings
         ) VALUES (
           $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8::jsonb,
           $9,
           CASE WHEN $10 = '' THEN NULL ELSE $10::uuid END,
           $11,
           $12::text[]
         )
         ON CONFLICT (source_table, source_file, source_row_id)
         DO UPDATE SET
           job_id = EXCLUDED.job_id,
           source_row_number = EXCLUDED.source_row_number,
           cluster_id = EXCLUDED.cluster_id,
           record_type = EXCLUDED.record_type,
           row_payload = EXCLUDED.row_payload,
           target_entity_type = EXCLUDED.target_entity_type,
           target_entity_id = EXCLUDED.target_entity_id,
           status = EXCLUDED.status,
           warnings = EXCLUDED.warnings`,
        [
          jobId,
          groupedRow.source_table,
          groupedRow.source_file,
          groupedRow.source_row_id,
          groupedRow.source_row_number,
          groupedRow.cluster_id,
          groupedRow.record_type,
          JSON.stringify(payload),
          stagingTargetType,
          targetEntityId,
          mapSourceStatusToStagingStatus(primary?.target_row_status ?? 'skipped'),
          warnings,
        ]
      );
    }

    const finalSummary = {
      ...report,
      jobId,
    };
    await client.query(
      `UPDATE cbis_import_jobs
       SET status = 'completed',
           summary = $2::jsonb,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [jobId, JSON.stringify(finalSummary)]
    );

    await client.query('COMMIT');
    return jobId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function run(pool: Pool, options: ImportOptions): Promise<ImportReport> {
  const normalizedSourceDir = resolveNormalizedSourceDir(options.sourceDir);
  const summaryPath = path.join(normalizedSourceDir, SUMMARY_FILENAME);
  const mappingPath = path.join(normalizedSourceDir, ENTITY_MAP_FILENAME);

  const summary = readJsonFile<NormalizedBundleSummary>(summaryPath);
  const mappingRows = readCsvFile(mappingPath);
  const groupedRows = groupMappingsBySourceRow(mappingRows);
  const report = buildReport(summary, groupedRows, options.sourceDir, normalizedSourceDir, options.dryRun);

  if (options.reportPath) {
    report.reportPath = path.resolve(options.reportPath);
  }

  if (!options.dryRun) {
    const jobId = await stageSourceRows(
      pool,
      path.resolve(options.sourceDir),
      normalizedSourceDir,
      groupedRows,
      report,
      options.actorUserId
    );
    report.jobId = jobId;
  }

  if (report.reportPath) {
    fs.writeFileSync(report.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  return report;
}

export const cbisUnifiedImport = {
  run,
};
