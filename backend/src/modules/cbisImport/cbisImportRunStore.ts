import type { PoolClient } from 'pg';
import { CBIS_IMPORT_ENTITY_ORDER, type CbisImportEntityType, type CbisImportRow, getSchemaBundleVersion, type LoadedCbisImportBundle } from './cbisImportBundle';
import type { CbisImportEntityResult, DuplicateIssue, DuplicateSafetyPlan, RunCbisImportOptions } from './cbisImportTypes';
import {
  requiredText,
  requiredTextMax,
  normalizeText,
  statusFor,
  text,
  textMax,
  uuid,
} from './cbisImportRowUtils';

const toIssueRow = (issue: DuplicateIssue): CbisImportRow => ({
  scope: 'target_row',
  gap_category: issue.reason === 'dependent_row_held' ? 'dependency_held_for_review' : 'duplicate_conflict',
  entity_type: issue.entityType,
  entity_id: issue.targetEntityId ?? '',
  cluster_id: '',
  source_table: issue.source?.source_table ?? '',
  source_file: issue.source?.source_file ?? '',
  source_row_id: issue.source?.source_row_id ?? '',
  source_row_number: '',
  source_row_hash: issue.source?.source_row_hash ?? '',
  reason: issue.reason,
  details: issue.details,
});

const emptyEntityResult = (): CbisImportEntityResult => ({
  ready: 0,
  invalid: 0,
  review_required: 0,
  skipped: 0,
  imported: 0,
  failed: 0,
});

export const buildInitialEntityResults = (
  bundle: LoadedCbisImportBundle
): Record<CbisImportEntityType, CbisImportEntityResult> => {
  const results = {} as Record<CbisImportEntityType, CbisImportEntityResult>;
  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    const result = emptyEntityResult();
    for (const row of bundle.entities[entityType]) {
      const status = statusFor(row);
      if (status === 'ready') result.ready += 1;
      else if (status === 'invalid') result.invalid += 1;
      else if (status === 'review_required') result.review_required += 1;
      else if (status === 'skipped') result.skipped += 1;
      else result.review_required += 1;
    }
    results[entityType] = result;
  }
  return results;
};

export const insertRun = async (
  client: PoolClient,
  bundle: LoadedCbisImportBundle,
  options: RunCbisImportOptions,
  status: 'started' | 'succeeded' | 'failed' | 'rolled_back',
  dryRunRequiredRunId?: string
): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO cbis_import_runs (
        organization_id,
        actor_id,
        mode,
        status,
        bundle_path,
        bundle_fingerprint,
        schema_bundle_version,
        schema_bundle,
        import_summary,
        readiness_report_path,
        rollback_artifact_path,
        dry_run_required_run_id,
        completed_at
      ) VALUES (
        $1, $2, $3, $4::text, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, CASE WHEN $4::text = 'started' THEN NULL ELSE CURRENT_TIMESTAMP END
      )
      RETURNING id
    `,
    [
      options.organizationId,
      options.actorId,
      options.mode,
      status,
      bundle.bundleDir,
      bundle.fingerprint,
      getSchemaBundleVersion(bundle),
      JSON.stringify(bundle.schemaBundle),
      JSON.stringify(bundle.summary),
      bundle.readinessReportPath,
      options.rollbackArtifactPath ?? null,
      dryRunRequiredRunId ?? null,
    ]
  );
  return result.rows[0].id;
};

export const finishRun = async (
  client: PoolClient,
  runId: string,
  status: 'succeeded' | 'failed' | 'rolled_back',
  errorMessage?: string
): Promise<void> => {
  await client.query(
    `
      UPDATE cbis_import_runs
      SET status = $2, error_message = $3, completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [runId, status, errorMessage ?? null]
  );
};

export const findSuccessfulDryRun = async (
  client: PoolClient,
  bundle: LoadedCbisImportBundle,
  organizationId: string
): Promise<string | null> => {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM cbis_import_runs
      WHERE organization_id = $1
        AND bundle_fingerprint = $2
        AND schema_bundle_version = $3
        AND mode = 'dry-run'
        AND status = 'succeeded'
      ORDER BY completed_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `,
    [organizationId, bundle.fingerprint, getSchemaBundleVersion(bundle)]
  );
  return result.rows[0]?.id ?? null;
};

const insertCounters = async (
  client: PoolClient,
  runId: string,
  results: Record<CbisImportEntityType, CbisImportEntityResult>
): Promise<void> => {
  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    const result = results[entityType];
    await client.query(
      `
        INSERT INTO cbis_import_entity_counters (
          import_run_id,
          entity_type,
          ready_count,
          invalid_count,
          review_required_count,
          skipped_count,
          imported_count,
          failed_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (import_run_id, entity_type) DO UPDATE SET
          ready_count = EXCLUDED.ready_count,
          invalid_count = EXCLUDED.invalid_count,
          review_required_count = EXCLUDED.review_required_count,
          skipped_count = EXCLUDED.skipped_count,
          imported_count = EXCLUDED.imported_count,
          failed_count = EXCLUDED.failed_count
      `,
      [
        runId,
        entityType,
        result.ready,
        result.invalid,
        result.review_required,
        result.skipped,
        result.imported,
        result.failed,
      ]
    );
  }
};

const sourceRowNumber = (row: CbisImportRow): number | null => {
  const raw = text(row, 'source_row_number');
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const sourceRowLedgerStatus = (row: CbisImportRow): string => {
  const explicitStatus = textMax(row, 'target_row_status', 30) ?? textMax(row, 'row_status', 30);
  if (explicitStatus) {
    return explicitStatus;
  }

  const category = normalizeText(text(row, 'gap_category') ?? text(row, 'reason'));
  if (!category) {
    return 'staged';
  }
  if (category.includes('invalid')) {
    return 'invalid';
  }
  if (category.includes('skip') || category.includes('exclusion')) {
    return 'skipped';
  }
  return 'review_required';
};

const insertSourceRows = async (
  client: PoolClient,
  runId: string,
  bundle: LoadedCbisImportBundle
): Promise<void> => {
  const sourceRows = new Map<string, CbisImportRow>();
  for (const row of [...bundle.entityMapRows, ...bundle.gapRows]) {
    const sourceFile = text(row, 'source_file');
    const sourceTable = text(row, 'source_table');
    const sourceRowId = text(row, 'source_row_id');
    if (!sourceFile || !sourceTable || !sourceRowId) {
      continue;
    }
    sourceRows.set(`${sourceFile}\0${sourceTable}\0${sourceRowId}`, row);
  }

  for (const row of sourceRows.values()) {
    await client.query(
      `
        INSERT INTO cbis_import_source_rows (
          import_run_id,
          source_file,
          source_table,
          source_row_id,
          source_row_number,
          source_row_hash,
          cluster_id,
          row_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (import_run_id, source_file, source_table, source_row_id) DO UPDATE SET
          source_row_number = EXCLUDED.source_row_number,
          source_row_hash = EXCLUDED.source_row_hash,
          cluster_id = EXCLUDED.cluster_id,
          row_status = EXCLUDED.row_status
      `,
      [
        runId,
        requiredText(row, 'source_file'),
        requiredText(row, 'source_table'),
        requiredText(row, 'source_row_id'),
        sourceRowNumber(row),
        text(row, 'source_row_hash'),
        text(row, 'cluster_id'),
        sourceRowLedgerStatus(row),
      ]
    );
  }
};

const insertEntityMapRows = async (
  client: PoolClient,
  runId: string,
  rows: CbisImportRow[]
): Promise<void> => {
  for (const row of rows) {
    if (!text(row, 'target_entity_type')) {
      continue;
    }

    await client.query(
      `
        INSERT INTO cbis_import_entity_map (
          import_run_id,
          source_file,
          source_table,
          source_row_id,
          source_row_hash,
          cluster_id,
          cluster_record_type,
          target_entity_type,
          target_entity_id,
          target_row_status,
          derivation_reason,
          validation_errors,
          validation_warnings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid, $10, $11, $12, $13)
      `,
      [
        runId,
        requiredText(row, 'source_file'),
        requiredText(row, 'source_table'),
        requiredText(row, 'source_row_id'),
        text(row, 'source_row_hash'),
        text(row, 'cluster_id'),
        text(row, 'cluster_record_type'),
        requiredText(row, 'target_entity_type'),
        uuid(row, 'target_entity_id'),
        requiredTextMax(row, 'target_row_status', 30),
        text(row, 'derivation_reason'),
        text(row, 'validation_errors'),
        text(row, 'validation_warnings'),
      ]
    );
  }
};

const buildNonReadyIssues = (bundle: LoadedCbisImportBundle): CbisImportRow[] => {
  const issues: CbisImportRow[] = [...bundle.gapRows];
  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    for (const row of bundle.entities[entityType]) {
      const status = statusFor(row);
      if (status === 'ready') {
        continue;
      }
      issues.push({
        scope: 'target_row',
        gap_category:
          status === 'invalid'
            ? 'mapped_to_invalid'
            : status === 'skipped'
              ? 'intentional_reference_exclusion'
              : 'mapped_to_review',
        entity_type: entityType,
        entity_id: text(row, `${entityType === 'event_occurrences' ? 'occurrence' : entityType.slice(0, -1)}_id`) ?? '',
        cluster_id: text(row, 'source_cluster_id') ?? '',
        source_table: text(row, 'source_tables') ?? '',
        source_file: '',
        source_row_id: text(row, 'source_row_ids') ?? '',
        source_row_number: '',
        source_row_hash: '',
        reason: status,
        details: text(row, 'validation_errors') ?? text(row, 'validation_warnings') ?? '',
      });
    }
  }
  return issues;
};

const insertIssues = async (
  client: PoolClient,
  runId: string,
  issues: CbisImportRow[]
): Promise<void> => {
  for (const row of issues) {
    await client.query(
      `
        INSERT INTO cbis_import_issues (
          import_run_id,
          scope,
          gap_category,
          entity_type,
          entity_id,
          cluster_id,
          source_table,
          source_file,
          source_row_id,
          source_row_number,
          source_row_hash,
          reason,
          details
        ) VALUES ($1, $2, $3, $4, $5::uuid, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        runId,
        text(row, 'scope') ?? 'target_row',
        text(row, 'gap_category') ?? 'mapped_to_review',
        text(row, 'entity_type'),
        uuid(row, 'entity_id'),
        text(row, 'cluster_id'),
        text(row, 'source_table'),
        text(row, 'source_file'),
        text(row, 'source_row_id'),
        sourceRowNumber(row),
        text(row, 'source_row_hash'),
        text(row, 'reason') ?? 'review_required',
        text(row, 'details'),
      ]
    );
  }
};

export const persistAudit = async (
  client: PoolClient,
  runId: string,
  bundle: LoadedCbisImportBundle,
  results: Record<CbisImportEntityType, CbisImportEntityResult>,
  safetyPlan: DuplicateSafetyPlan
): Promise<number> => {
  const issues = [...buildNonReadyIssues(bundle), ...safetyPlan.duplicateIssues.map(toIssueRow)];
  await insertSourceRows(client, runId, bundle);
  await insertEntityMapRows(client, runId, bundle.entityMapRows);
  await insertIssues(client, runId, issues);
  await insertCounters(client, runId, results);
  return issues.length;
};
