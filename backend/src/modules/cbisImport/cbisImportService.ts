import type { Pool, PoolClient } from 'pg';
import { rawPool, setCurrentUserId } from '@config/database';
import { encrypt } from '@utils/encryption';
import {
  CBIS_IMPORT_ENTITY_ORDER,
  type CbisImportEntityType,
  type CbisImportRow,
  getSchemaBundleVersion,
  loadCbisImportBundle,
  type LoadedCbisImportBundle,
} from './cbisImportBundle';

export type CbisImportMode = 'dry-run' | 'apply';

export interface RunCbisImportOptions {
  bundleDir: string;
  organizationId: string;
  actorId: string;
  mode: CbisImportMode;
  rollbackArtifactPath?: string;
}

export interface CbisImportEntityResult {
  ready: number;
  invalid: number;
  review_required: number;
  skipped: number;
  imported: number;
  failed: number;
}

export interface CbisImportRunResult {
  run_id: string;
  mode: CbisImportMode;
  status: 'succeeded' | 'failed';
  bundle_fingerprint: string;
  schema_bundle_version: string;
  per_entity: Record<string, CbisImportEntityResult>;
  issue_count: number;
  duplicate_safety: {
    duplicate_conflicts: number;
    held_for_review: number;
    idempotent_updates: number;
    provenance_conflicts: number;
  };
  reconciliation: {
    ready_rows: number;
    imported_rows: number;
    held_out_rows: number;
    mapping_rows: number;
    gap_rows: number;
  };
}

type Scalar = string | number | boolean | string[] | null;

interface ImportProvenanceSource {
  source_file: string;
  source_table: string;
  source_row_id: string;
  source_row_hash: string | null;
}

interface DuplicateIssue {
  entityType: CbisImportEntityType;
  targetEntityId: string | null;
  source: ImportProvenanceSource | null;
  reason: string;
  details: string;
  provenanceConflict: boolean;
}

interface DuplicateSafetyPlan {
  duplicateIssues: DuplicateIssue[];
  heldKeys: Set<string>;
  safeRows: Record<CbisImportEntityType, CbisImportRow[]>;
  safeProvenance: Map<string, ImportProvenanceSource[]>;
  idempotentUpdates: number;
  provenanceConflicts: number;
}

interface DependencyReference {
  entityType: CbisImportEntityType;
  targetEntityId: string;
  label: string;
}

interface ExistingProvenanceRow {
  target_entity_type: string;
  target_entity_id: string;
  source_file: string;
  source_table: string;
  source_row_id: string;
  source_row_hash: string | null;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const text = (row: CbisImportRow, key: string): string | null => {
  const value = row[key]?.trim();
  return value ? value : null;
};

const requiredText = (row: CbisImportRow, key: string): string => {
  const value = text(row, key);
  if (!value) {
    throw new Error(`Missing required ${key}`);
  }
  return value;
};

const truncateForVarchar = (value: string | null, maxLength: number): string | null => {
  if (!value || value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }
  return `${value.slice(0, maxLength - 3)}...`;
};

const textMax = (row: CbisImportRow, key: string, maxLength: number): string | null =>
  truncateForVarchar(text(row, key), maxLength);

const requiredTextMax = (row: CbisImportRow, key: string, maxLength: number): string =>
  truncateForVarchar(requiredText(row, key), maxLength) as string;

const uuid = (row: CbisImportRow, key: string): string | null => {
  const value = text(row, key);
  if (!value) {
    return null;
  }
  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid UUID in ${key}: ${value}`);
  }
  return value;
};

const requiredUuid = (row: CbisImportRow, key: string): string => {
  const value = uuid(row, key);
  if (!value) {
    throw new Error(`Missing required UUID ${key}`);
  }
  return value;
};

const numberValue = (row: CbisImportRow, key: string): number | null => {
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

const intValue = (row: CbisImportRow, key: string): number | null => {
  const parsed = numberValue(row, key);
  return parsed === null ? null : Math.trunc(parsed);
};

const boolValue = (row: CbisImportRow, key: string): boolean | null => {
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

const listValue = (row: CbisImportRow, key: string): string[] => {
  const value = text(row, key);
  if (!value) {
    return [];
  }
  return Array.from(new Set(value.split(/[|;,]/).map((item) => item.trim()).filter(Boolean)));
};

const jsonValue = (row: CbisImportRow, key: string): unknown => {
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

const statusFor = (row: CbisImportRow): string => text(row, 'row_status') ?? 'ready';

const normalizeText = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
};

const normalizePhone = (value: string | null): string | null => {
  const normalized = value?.replace(/\D/g, '') ?? '';
  return normalized.length >= 7 ? normalized : null;
};

const targetIdColumnFor = (entityType: CbisImportEntityType): string => {
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

const provenanceEntityAliases = (entityType: CbisImportEntityType): string[] => {
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

const rowKey = (entityType: CbisImportEntityType, targetEntityId: string | null): string =>
  `${entityType}:${targetEntityId ?? 'missing-target-id'}`;

const sourceKey = (source: ImportProvenanceSource): string =>
  `${source.source_file}\0${source.source_table}\0${source.source_row_id}`;

const entitySourceKey = (entityType: CbisImportEntityType, source: ImportProvenanceSource): string =>
  `${entityType}\0${sourceKey(source)}`;

const sourceHashKey = (entityType: CbisImportEntityType, sourceHash: string): string =>
  `${entityType}\0${sourceHash}`;

const referenceEntityTypeFor = (value: string | null): CbisImportEntityType | null => {
  const normalized = normalizeText(value)?.replace(/[-\s]/g, '_');
  if (!normalized) {
    return null;
  }
  const aliases: Record<string, CbisImportEntityType> = {
    account: 'accounts',
    accounts: 'accounts',
    organization: 'accounts',
    organizations: 'accounts',
    contact: 'contacts',
    contacts: 'contacts',
    participant: 'contacts',
    person: 'contacts',
    case: 'cases',
    cases: 'cases',
    event: 'events',
    events: 'events',
    event_occurrence: 'event_occurrences',
    event_occurrences: 'event_occurrences',
    occurrence: 'event_occurrences',
    volunteer: 'volunteers',
    volunteers: 'volunteers',
  };
  return aliases[normalized] ?? null;
};

const dependencyReferencesFor = (entityType: CbisImportEntityType, row: CbisImportRow): DependencyReference[] => {
  const references: DependencyReference[] = [];
  const addReference = (targetType: CbisImportEntityType, key: string, label = key): void => {
    const targetEntityId = uuid(row, key);
    if (targetEntityId) {
      references.push({ entityType: targetType, targetEntityId, label });
    }
  };
  const addPolymorphicReference = (typeKey: string, idKey: string, label: string): void => {
    const targetType = referenceEntityTypeFor(text(row, typeKey));
    const targetEntityId = uuid(row, idKey);
    if (targetType && targetEntityId) {
      references.push({ entityType: targetType, targetEntityId, label });
    }
  };

  if (entityType === 'contacts') {
    addReference('accounts', 'account_id');
  } else if (entityType === 'cases') {
    addReference('contacts', 'contact_id');
    addReference('accounts', 'account_id');
  } else if (entityType === 'case_type_assignments' || entityType === 'case_outcome_assignments') {
    addReference('cases', 'case_id');
  } else if (entityType === 'event_occurrences') {
    addReference('events', 'event_id');
  } else if (entityType === 'event_registrations') {
    addReference('events', 'event_id');
    addReference('event_occurrences', 'occurrence_id');
    addReference('contacts', 'contact_id');
  } else if (entityType === 'activities') {
    addReference('cases', 'case_id');
    addReference('contacts', 'contact_id');
    addReference('accounts', 'account_id');
    addReference('events', 'event_id');
  } else if (entityType === 'activity_events') {
    addPolymorphicReference('entity_type', 'entity_id', 'entity_id');
    addPolymorphicReference('related_entity_type', 'related_entity_id', 'related_entity_id');
  } else if (entityType === 'donations') {
    addReference('accounts', 'account_id');
    addReference('contacts', 'contact_id');
  } else if (entityType === 'volunteers') {
    addReference('contacts', 'contact_id');
  } else if (entityType === 'volunteer_hours') {
    addReference('volunteers', 'volunteer_id');
  } else if (entityType === 'follow_ups') {
    addPolymorphicReference('entity_type', 'entity_id', 'entity_id');
  }

  return references;
};

const collectTargetKeys = (rows: Record<CbisImportEntityType, CbisImportRow[]>): Set<string> => {
  const keys = new Set<string>();
  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    for (const row of rows[entityType]) {
      const targetEntityId = uuid(row, targetIdColumnFor(entityType));
      if (targetEntityId) {
        keys.add(rowKey(entityType, targetEntityId));
      }
    }
  }
  return keys;
};

const collectBundleTargetKeys = (bundle: LoadedCbisImportBundle): Set<string> =>
  collectTargetKeys(bundle.entities);

const findBlockedDependency = (
  row: CbisImportRow,
  entityType: CbisImportEntityType,
  bundleTargetKeys: Set<string>,
  safeTargetKeys: Set<string>,
  heldKeys: Set<string>
): DependencyReference | null => {
  for (const reference of dependencyReferencesFor(entityType, row)) {
    const key = rowKey(reference.entityType, reference.targetEntityId);
    if (heldKeys.has(key) || (bundleTargetKeys.has(key) && !safeTargetKeys.has(key))) {
      return reference;
    }
  }
  return null;
};

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

const buildInitialEntityResults = (
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

const insertRun = async (
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

const finishRun = async (
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

const findSuccessfulDryRun = async (
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

const buildProvenanceByTarget = (bundle: LoadedCbisImportBundle): Map<string, ImportProvenanceSource[]> => {
  const provenance = new Map<string, ImportProvenanceSource[]>();
  for (const row of bundle.entityMapRows) {
    if (text(row, 'target_row_status') !== 'ready') {
      continue;
    }
    const targetId = uuid(row, 'target_entity_id');
    const targetEntityType = normalizeText(text(row, 'target_entity_type'));
    if (!targetId || !targetEntityType) {
      continue;
    }

    for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
      if (!provenanceEntityAliases(entityType).includes(targetEntityType)) {
        continue;
      }
      const key = rowKey(entityType, targetId);
      const rows = provenance.get(key) ?? [];
      rows.push({
        source_file: requiredText(row, 'source_file'),
        source_table: requiredText(row, 'source_table'),
        source_row_id: requiredText(row, 'source_row_id'),
        source_row_hash: text(row, 'source_row_hash'),
      });
      provenance.set(key, rows);
    }
  }
  return provenance;
};

const addDuplicateIssue = (
  issues: DuplicateIssue[],
  heldKeys: Set<string>,
  issue: DuplicateIssue
): void => {
  const key = rowKey(issue.entityType, issue.targetEntityId);
  heldKeys.add(key);
  if (
    issues.some(
      (existing) =>
        existing.entityType === issue.entityType &&
        existing.targetEntityId === issue.targetEntityId &&
        existing.reason === issue.reason &&
        existing.details === issue.details
    )
  ) {
    return;
  }
  issues.push(issue);
};

const holdDependentRowsForReview = (
  bundle: LoadedCbisImportBundle,
  safetyPlan: DuplicateSafetyPlan
): void => {
  const bundleTargetKeys = collectBundleTargetKeys(bundle);
  let changed = true;

  while (changed) {
    changed = false;
    const safeTargetKeys = collectTargetKeys(safetyPlan.safeRows);

    for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
      const nextRows: CbisImportRow[] = [];
      for (const row of safetyPlan.safeRows[entityType]) {
        const targetEntityId = uuid(row, targetIdColumnFor(entityType));
        const blockedDependency = findBlockedDependency(
          row,
          entityType,
          bundleTargetKeys,
          safeTargetKeys,
          safetyPlan.heldKeys
        );

        if (!targetEntityId || !blockedDependency) {
          nextRows.push(row);
          continue;
        }

        const key = rowKey(entityType, targetEntityId);
        const provenance = safetyPlan.safeProvenance.get(key) ?? [];
        addDuplicateIssue(safetyPlan.duplicateIssues, safetyPlan.heldKeys, {
          entityType,
          targetEntityId,
          source: provenance[0] ?? null,
          reason: 'dependent_row_held',
          details: `Prepared ${entityType} row depends on held ${blockedDependency.entityType}:${blockedDependency.targetEntityId} via ${blockedDependency.label}`,
          provenanceConflict: false,
        });
        safetyPlan.safeProvenance.delete(key);
        changed = true;
      }
      safetyPlan.safeRows[entityType] = nextRows;
    }
  }
};

const findExistingProvenance = async (
  client: PoolClient,
  organizationId: string,
  entityType: CbisImportEntityType,
  targetIds: string[],
  sources: ImportProvenanceSource[]
): Promise<ExistingProvenanceRow[]> => {
  const sourceFiles = sources.map((source) => source.source_file);
  const sourceTables = sources.map((source) => source.source_table);
  const sourceRowIds = sources.map((source) => source.source_row_id);
  const sourceHashes = sources.map((source) => source.source_row_hash).filter((hash): hash is string => Boolean(hash));

  if (targetIds.length === 0 && sources.length === 0 && sourceHashes.length === 0) {
    return [];
  }

  const result = await client.query<ExistingProvenanceRow>(
    `
      WITH requested_sources AS (
        SELECT *
        FROM UNNEST($4::text[], $5::text[], $6::text[]) AS source_rows(source_file, source_table, source_row_id)
      )
      SELECT DISTINCT
        p.target_entity_type,
        p.target_entity_id::text,
        p.source_file,
        p.source_table,
        p.source_row_id,
        p.source_row_hash
      FROM cbis_import_target_provenance p
      LEFT JOIN requested_sources requested
        ON requested.source_file = p.source_file
       AND requested.source_table = p.source_table
       AND requested.source_row_id = p.source_row_id
      WHERE p.organization_id = $1
        AND p.target_entity_type = $2
        AND (
          p.target_entity_id = ANY($3::uuid[])
          OR requested.source_row_id IS NOT NULL
          OR (p.source_row_hash IS NOT NULL AND p.source_row_hash = ANY($7::text[]))
        )
    `,
    [
      organizationId,
      entityType,
      targetIds,
      sourceFiles,
      sourceTables,
      sourceRowIds,
      sourceHashes,
    ]
  );
  return result.rows;
};

const hasNaturalDuplicate = async (
  client: PoolClient,
  entityType: CbisImportEntityType,
  row: CbisImportRow,
  targetEntityId: string,
  organizationId: string
): Promise<string | null> => {
  if (entityType === 'accounts') {
    const accountNumber = text(row, 'account_number');
    if (accountNumber) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM accounts WHERE account_number = $1 AND id <> $2::uuid LIMIT 1',
        [accountNumber, targetEntityId]
      );
      if (result.rows.length > 0) return `account_number ${accountNumber}`;
    }
    const accountName = normalizeText(text(row, 'account_name'));
    const email = normalizeText(text(row, 'email'));
    if (accountName && email) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM accounts WHERE lower(account_name) = $1 AND lower(email) = $2 AND id <> $3::uuid LIMIT 1',
        [accountName, email, targetEntityId]
      );
      if (result.rows.length > 0) return `account_name/email ${accountName}/${email}`;
    }
  }

  if (entityType === 'contacts') {
    const email = normalizeText(text(row, 'email'));
    if (email) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM contacts WHERE lower(email) = $1 AND id <> $2::uuid LIMIT 1',
        [email, targetEntityId]
      );
      if (result.rows.length > 0) return `contact email ${email}`;
    }
    const firstName = normalizeText(text(row, 'first_name'));
    const lastName = normalizeText(text(row, 'last_name'));
    const birthDate = text(row, 'birth_date');
    const phone = normalizePhone(text(row, 'phone') ?? text(row, 'mobile_phone'));
    if (firstName && lastName && (birthDate || phone)) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM contacts
          WHERE lower(first_name) = $1
            AND lower(last_name) = $2
            AND id <> $3::uuid
            AND (
              ($4::date IS NOT NULL AND birth_date = $4::date)
              OR ($5::text IS NOT NULL AND regexp_replace(coalesce(nullif(phone, ''), nullif(mobile_phone, ''), ''), '\\D', '', 'g') = $5)
            )
          LIMIT 1
        `,
        [firstName, lastName, targetEntityId, birthDate, phone]
      );
      if (result.rows.length > 0) return 'contact name plus birth date or phone';
    }
  }

  if (entityType === 'cases') {
    const caseNumber = text(row, 'case_number');
    if (caseNumber) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM cases WHERE case_number = $1 AND id <> $2::uuid LIMIT 1',
        [caseNumber, targetEntityId]
      );
      if (result.rows.length > 0) return `case_number ${caseNumber}`;
    }
  }

  if (entityType === 'events') {
    const name = normalizeText(text(row, 'event_name'));
    const startDate = text(row, 'start_date');
    const endDate = text(row, 'end_date');
    if (name && startDate && endDate) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM events
          WHERE organization_id = $1::uuid
            AND lower(name) = $2
            AND start_date = $3::timestamptz
            AND end_date = $4::timestamptz
            AND id <> $5::uuid
          LIMIT 1
        `,
        [organizationId, name, startDate, endDate, targetEntityId]
      );
      if (result.rows.length > 0) return 'event organization/name/start/end';
    }
  }

  if (entityType === 'event_occurrences') {
    const eventId = uuid(row, 'event_id');
    const scheduledStartDate = text(row, 'scheduled_start_date');
    if (eventId && scheduledStartDate) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM event_occurrences WHERE event_id = $1::uuid AND scheduled_start_date = $2::timestamptz AND id <> $3::uuid LIMIT 1',
        [eventId, scheduledStartDate, targetEntityId]
      );
      if (result.rows.length > 0) return 'event occurrence event/scheduled start';
    }
  }

  if (entityType === 'event_registrations') {
    const occurrenceId = uuid(row, 'occurrence_id');
    const contactId = uuid(row, 'contact_id');
    if (occurrenceId && contactId) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM event_registrations WHERE occurrence_id = $1::uuid AND contact_id = $2::uuid AND id <> $3::uuid LIMIT 1',
        [occurrenceId, contactId, targetEntityId]
      );
      if (result.rows.length > 0) return 'event registration occurrence/contact';
    }
  }

  if (entityType === 'donations') {
    const donationNumber = text(row, 'donation_number');
    if (donationNumber) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM donations WHERE donation_number = $1 AND id <> $2::uuid LIMIT 1',
        [donationNumber, targetEntityId]
      );
      if (result.rows.length > 0) return `donation_number ${donationNumber}`;
    }
    const transactionId = text(row, 'transaction_id');
    if (transactionId) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM donations WHERE transaction_id = $1 AND id <> $2::uuid LIMIT 1',
        [transactionId, targetEntityId]
      );
      if (result.rows.length > 0) return `transaction_id ${transactionId}`;
    }
  }

  if (entityType === 'volunteers') {
    const contactId = uuid(row, 'contact_id');
    if (contactId) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM volunteers WHERE contact_id = $1::uuid AND id <> $2::uuid LIMIT 1',
        [contactId, targetEntityId]
      );
      if (result.rows.length > 0) return 'volunteer contact';
    }
  }

  if (entityType === 'volunteer_hours') {
    const volunteerId = uuid(row, 'volunteer_id');
    const activityDate = text(row, 'activity_date');
    const hoursLogged = numberValue(row, 'hours_logged');
    const activityType = normalizeText(text(row, 'activity_type'));
    if (volunteerId && activityDate && hoursLogged !== null) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM volunteer_hours
          WHERE volunteer_id = $1::uuid
            AND activity_date = $2::date
            AND hours_logged = $3
            AND coalesce(lower(activity_type), '') = coalesce($4, '')
            AND id <> $5::uuid
          LIMIT 1
        `,
        [volunteerId, activityDate, hoursLogged, activityType, targetEntityId]
      );
      if (result.rows.length > 0) return 'volunteer hours volunteer/date/hours/type';
    }
  }

  if (entityType === 'follow_ups') {
    const entityId = uuid(row, 'entity_id');
    const entityKind = text(row, 'entity_type');
    const title = normalizeText(text(row, 'title'));
    const scheduledDate = text(row, 'scheduled_date');
    if (entityId && entityKind && title && scheduledDate) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM follow_ups
          WHERE organization_id = $1::uuid
            AND entity_type = $2
            AND entity_id = $3::uuid
            AND lower(title) = $4
            AND scheduled_date = $5::date
            AND id <> $6::uuid
          LIMIT 1
        `,
        [organizationId, entityKind, entityId, title, scheduledDate, targetEntityId]
      );
      if (result.rows.length > 0) return 'follow-up entity/title/scheduled date';
    }
  }

  if (entityType === 'activity_events') {
    const sourceTable = text(row, 'source_table');
    const sourceRecordId = uuid(row, 'source_record_id');
    const activityType = text(row, 'activity_type');
    if (sourceTable && sourceRecordId && activityType) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM activity_events WHERE source_table = $1 AND source_record_id = $2::uuid AND activity_type = $3 AND id <> $4::uuid LIMIT 1',
        [sourceTable, sourceRecordId, activityType, targetEntityId]
      );
      if (result.rows.length > 0) return 'activity event source/activity type';
    }
    const entityId = uuid(row, 'entity_id');
    const entityKind = text(row, 'entity_type');
    const title = normalizeText(text(row, 'title'));
    const occurredAt = text(row, 'occurred_at');
    if (entityId && entityKind && title && activityType && occurredAt) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM activity_events
          WHERE organization_id = $1::uuid
            AND entity_type = $2
            AND entity_id = $3::uuid
            AND activity_type = $4
            AND lower(title) = $5
            AND occurred_at = $6::timestamptz
            AND id <> $7::uuid
          LIMIT 1
        `,
        [organizationId, entityKind, entityId, activityType, title, occurredAt, targetEntityId]
      );
      if (result.rows.length > 0) return 'activity event entity/type/title/time';
    }
  }

  return null;
};

const buildDuplicateSafetyPlan = async (
  client: PoolClient,
  bundle: LoadedCbisImportBundle,
  organizationId: string
): Promise<DuplicateSafetyPlan> => {
  const duplicateIssues: DuplicateIssue[] = [];
  const heldKeys = new Set<string>();
  const safeRows = {} as Record<CbisImportEntityType, CbisImportRow[]>;
  const safeProvenance = new Map<string, ImportProvenanceSource[]>();
  const provenanceByTarget = buildProvenanceByTarget(bundle);
  let idempotentUpdates = 0;
  let provenanceConflicts = 0;

  const sourceClaims = new Map<string, { entityType: CbisImportEntityType; targetEntityId: string }>();
  const sourceHashClaims = new Map<string, { entityType: CbisImportEntityType; targetEntityId: string }>();

  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    const readyRows = bundle.entities[entityType].filter((item) => statusFor(item) === 'ready');
    safeRows[entityType] = [];
    const seenTargets = new Set<string>();
    const targetIds: string[] = [];
    const sources: ImportProvenanceSource[] = [];
    const sourceToPreparedTarget = new Map<string, { targetEntityId: string; source: ImportProvenanceSource }>();
    const hashToPreparedTarget = new Map<string, { targetEntityId: string; source: ImportProvenanceSource }>();

    for (const row of readyRows) {
      const targetEntityId = uuid(row, targetIdColumnFor(entityType));
      const key = rowKey(entityType, targetEntityId);
      if (!targetEntityId) {
        addDuplicateIssue(duplicateIssues, heldKeys, {
          entityType,
          targetEntityId,
          source: null,
          reason: 'missing_target_id',
          details: `Ready ${entityType} row is missing ${targetIdColumnFor(entityType)}`,
          provenanceConflict: true,
        });
        provenanceConflicts += 1;
        continue;
      }

      if (seenTargets.has(targetEntityId)) {
        addDuplicateIssue(duplicateIssues, heldKeys, {
          entityType,
          targetEntityId,
          source: null,
          reason: 'duplicate_target_id_in_bundle',
          details: `Prepared bundle contains multiple ready ${entityType} rows for target id ${targetEntityId}`,
          provenanceConflict: true,
        });
        provenanceConflicts += 1;
      }
      seenTargets.add(targetEntityId);
      targetIds.push(targetEntityId);

      for (const source of provenanceByTarget.get(key) ?? []) {
        sources.push(source);
        sourceToPreparedTarget.set(sourceKey(source), { targetEntityId, source });
        const existingSourceClaim = sourceClaims.get(entitySourceKey(entityType, source));
        if (existingSourceClaim && existingSourceClaim.targetEntityId !== targetEntityId) {
          addDuplicateIssue(duplicateIssues, heldKeys, {
            entityType,
            targetEntityId,
            source,
            reason: 'source_maps_to_multiple_targets_in_bundle',
            details: `Source row is already claimed by ${existingSourceClaim.entityType}:${existingSourceClaim.targetEntityId}`,
            provenanceConflict: true,
          });
          provenanceConflicts += 1;
        } else {
          sourceClaims.set(entitySourceKey(entityType, source), { entityType, targetEntityId });
        }

        if (source.source_row_hash) {
          const hashKey = sourceHashKey(entityType, source.source_row_hash);
          hashToPreparedTarget.set(hashKey, { targetEntityId, source });
          const existingHashClaim = sourceHashClaims.get(hashKey);
          if (existingHashClaim && existingHashClaim.targetEntityId !== targetEntityId) {
            addDuplicateIssue(duplicateIssues, heldKeys, {
              entityType,
              targetEntityId,
              source,
              reason: 'source_hash_maps_to_multiple_targets_in_bundle',
              details: `Source hash is already claimed by ${existingHashClaim.entityType}:${existingHashClaim.targetEntityId}`,
              provenanceConflict: true,
            });
            provenanceConflicts += 1;
          } else {
            sourceHashClaims.set(hashKey, { entityType, targetEntityId });
          }
        }
      }
    }

    const existingProvenance = await findExistingProvenance(client, organizationId, entityType, targetIds, sources);
    for (const existing of existingProvenance) {
      const key = rowKey(entityType, existing.target_entity_id);
      const matchingSources = provenanceByTarget.get(key) ?? [];
      const existingSourceKey = sourceKey(existing);
      const existingHashKey = existing.source_row_hash ? sourceHashKey(entityType, existing.source_row_hash) : null;
      const sameSource = matchingSources.some(
        (source) =>
          source.source_file === existing.source_file &&
          source.source_table === existing.source_table &&
          source.source_row_id === existing.source_row_id &&
          (!source.source_row_hash || !existing.source_row_hash || source.source_row_hash === existing.source_row_hash)
      );

      if (sameSource) {
        idempotentUpdates += 1;
        continue;
      }

      const requestedBySource = sourceToPreparedTarget.get(existingSourceKey);
      const requestedByHash = existingHashKey ? hashToPreparedTarget.get(existingHashKey) : undefined;
      const requestedDifferentTarget =
        requestedBySource?.targetEntityId !== existing.target_entity_id ? requestedBySource : undefined;
      const requestedDifferentHashTarget =
        requestedByHash?.targetEntityId !== existing.target_entity_id ? requestedByHash : undefined;
      const conflictingRequest = requestedDifferentTarget ?? requestedDifferentHashTarget;

      if (conflictingRequest) {
        addDuplicateIssue(duplicateIssues, heldKeys, {
          entityType,
          targetEntityId: conflictingRequest.targetEntityId,
          source: conflictingRequest.source,
          reason: 'source_already_imported_to_different_target',
          details: `Existing CBIS provenance maps this source to ${entityType}:${existing.target_entity_id}`,
          provenanceConflict: true,
        });
        provenanceConflicts += 1;
        continue;
      }

      addDuplicateIssue(duplicateIssues, heldKeys, {
        entityType,
        targetEntityId: existing.target_entity_id,
        source: matchingSources[0] ?? {
          source_file: existing.source_file,
          source_table: existing.source_table,
          source_row_id: existing.source_row_id,
          source_row_hash: existing.source_row_hash,
        },
        reason: 'provenance_conflict',
        details: `Existing CBIS provenance for ${entityType}:${existing.target_entity_id} does not match this prepared row`,
        provenanceConflict: true,
      });
      provenanceConflicts += 1;
    }

    for (const row of readyRows) {
      const targetEntityId = uuid(row, targetIdColumnFor(entityType));
      const key = rowKey(entityType, targetEntityId);
      if (!targetEntityId || heldKeys.has(key)) {
        continue;
      }

      const duplicateReason = await hasNaturalDuplicate(client, entityType, row, targetEntityId, organizationId);
      if (duplicateReason) {
        addDuplicateIssue(duplicateIssues, heldKeys, {
          entityType,
          targetEntityId,
          source: (provenanceByTarget.get(key) ?? [])[0] ?? null,
          reason: 'duplicate_conflict',
          details: `Existing app row matches natural key: ${duplicateReason}`,
          provenanceConflict: false,
        });
        continue;
      }

      safeRows[entityType].push(row);
      safeProvenance.set(key, provenanceByTarget.get(key) ?? []);
    }
  }

  const safetyPlan = {
    duplicateIssues,
    heldKeys,
    safeRows,
    safeProvenance,
    idempotentUpdates,
    provenanceConflicts,
  };
  holdDependentRowsForReview(bundle, safetyPlan);
  return safetyPlan;
};

const applyDuplicatePlanToResults = (
  results: Record<CbisImportEntityType, CbisImportEntityResult>,
  safetyPlan: DuplicateSafetyPlan
): void => {
  const heldByEntity = new Map<CbisImportEntityType, Set<string>>();
  for (const issue of safetyPlan.duplicateIssues) {
    const held = heldByEntity.get(issue.entityType) ?? new Set<string>();
    held.add(issue.targetEntityId ?? issue.reason);
    heldByEntity.set(issue.entityType, held);
  }

  for (const [entityType, held] of heldByEntity.entries()) {
    results[entityType].review_required += held.size;
  }
};

const valuesFor = (columns: string[], row: Record<string, Scalar>): Scalar[] =>
  columns.map((column) => row[column] ?? null);

const upsertById = async (
  client: PoolClient,
  table: string,
  columns: string[],
  row: Record<string, Scalar>,
  updateColumns = columns.filter((column) => column !== 'id' && column !== 'created_at' && column !== 'created_by')
): Promise<void> => {
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const updates = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
  await client.query(
    `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET ${updates}
    `,
    valuesFor(columns, row)
  );
};

const ensureCaseLookups = async (
  client: PoolClient,
  actorId: string,
  safeRows: Record<CbisImportEntityType, CbisImportRow[]>
): Promise<void> => {
  const caseTypes = new Map<string, string>();
  const caseStatuses = new Map<string, string>();

  for (const row of safeRows.cases) {
    caseTypes.set(requiredUuid(row, 'case_type_id'), text(row, 'case_type_name') ?? 'General Support');
    caseStatuses.set(requiredUuid(row, 'status_id'), text(row, 'status_name') ?? text(row, 'status') ?? 'Intake');
  }

  for (const row of safeRows.case_type_assignments) {
    caseTypes.set(requiredUuid(row, 'case_type_id'), text(row, 'case_type_name') ?? 'General Support');
  }

  const existingTypeRows = caseTypes.size
    ? await client.query<{ id: string; name: string }>(
        `
          SELECT id, name
          FROM case_types
          WHERE name = ANY($1::text[])
        `,
        [[...new Set(caseTypes.values())]]
      )
    : { rows: [] };
  const existingCaseTypesByName = new Map(existingTypeRows.rows.map((row) => [row.name, row.id]));
  const caseTypeIdRemap = new Map<string, string>();

  for (const [id, name] of caseTypes.entries()) {
    const existingId = existingCaseTypesByName.get(name);
    if (existingId) {
      caseTypeIdRemap.set(id, existingId);
      continue;
    }

    await client.query(
      `
        INSERT INTO case_types (id, name, description, is_active, requires_intake, created_by, modified_by)
        VALUES ($1, $2, 'Imported from CBIS prepared bundle', true, false, $3, $3)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, modified_by = EXCLUDED.modified_by
      `,
      [id, name, actorId]
    );
  }

  if (caseTypeIdRemap.size > 0) {
    for (const row of [...safeRows.cases, ...safeRows.case_type_assignments]) {
      const mappedId = caseTypeIdRemap.get(row.case_type_id);
      if (mappedId) {
        row.case_type_id = mappedId;
      }
    }
  }

  const desiredStatusRows = [...caseStatuses.entries()].map(([id, name]) => ({
    id,
    name,
    statusType: name.toLowerCase().includes('closed') ? 'closed' : 'active',
  }));
  const existingStatusRows = desiredStatusRows.length
    ? await client.query<{ id: string; name: string; status_type: string }>(
        `
          SELECT DISTINCT ON (name, status_type) id, name, status_type
          FROM case_statuses
          WHERE (name, status_type) IN (
            SELECT desired.name, desired.status_type
            FROM UNNEST($1::text[], $2::text[]) AS desired(name, status_type)
          )
          ORDER BY name, status_type, sort_order ASC, created_at ASC
        `,
        [desiredStatusRows.map((row) => row.name), desiredStatusRows.map((row) => row.statusType)]
      )
    : { rows: [] };
  const existingStatusesByKey = new Map(
    existingStatusRows.rows.map((row) => [`${row.name}\u0000${row.status_type}`, row.id])
  );
  const caseStatusIdRemap = new Map<string, string>();

  for (const { id, name, statusType } of desiredStatusRows) {
    const existingId = existingStatusesByKey.get(`${name}\u0000${statusType}`);
    if (existingId) {
      caseStatusIdRemap.set(id, existingId);
      continue;
    }

    await client.query(
      `
        INSERT INTO case_statuses (id, name, status_type, description, sort_order, is_active)
        VALUES ($1, $2, $3, 'Imported from CBIS prepared bundle', 0, true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status_type = EXCLUDED.status_type
      `,
      [id, name, statusType]
    );
  }

  if (caseStatusIdRemap.size > 0) {
    for (const row of safeRows.cases) {
      const mappedId = caseStatusIdRemap.get(row.status_id);
      if (mappedId) {
        row.status_id = mappedId;
      }
    }
  }
};

const syncContactRoles = async (
  client: PoolClient,
  contactId: string,
  roles: string[],
  actorId: string
): Promise<void> => {
  if (roles.length === 0) {
    return;
  }
  for (const role of roles) {
    await client.query(
      `
        INSERT INTO contact_roles (name, description, is_system)
        VALUES ($1, 'Imported from CBIS prepared bundle', false)
        ON CONFLICT (name) DO NOTHING
      `,
      [role]
    );
  }
  await client.query(
    `
      INSERT INTO contact_role_assignments (contact_id, role_id, assigned_by)
      SELECT $1, cr.id, $3
      FROM contact_roles cr
      WHERE cr.name = ANY($2::text[])
      ON CONFLICT (contact_id, role_id) DO NOTHING
    `,
    [contactId, roles, actorId]
  );
};

const importReadyRows = async (
  client: PoolClient,
  options: RunCbisImportOptions,
  results: Record<CbisImportEntityType, CbisImportEntityResult>,
  safetyPlan: DuplicateSafetyPlan
): Promise<void> => {
  await ensureCaseLookups(client, options.actorId, safetyPlan.safeRows);

  for (const row of safetyPlan.safeRows.accounts) {
    await upsertById(client, 'accounts', [
      'id',
      'account_number',
      'account_name',
      'account_type',
      'category',
      'email',
      'phone',
      'website',
      'description',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'tax_id',
      'is_active',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'account_id'),
      account_number: text(row, 'account_number'),
      account_name: requiredText(row, 'account_name'),
      account_type: text(row, 'account_type'),
      category: text(row, 'category'),
      email: text(row, 'email'),
      phone: text(row, 'phone'),
      website: text(row, 'website'),
      description: text(row, 'description'),
      address_line1: text(row, 'address_line1'),
      address_line2: text(row, 'address_line2'),
      city: text(row, 'city'),
      state_province: text(row, 'state_province'),
      postal_code: text(row, 'postal_code'),
      country: text(row, 'country'),
      tax_id: text(row, 'tax_id'),
      is_active: boolValue(row, 'is_active') ?? true,
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.accounts.imported += 1;
  }

  for (const row of safetyPlan.safeRows.contacts) {
    const contactId = requiredUuid(row, 'contact_id');
    await upsertById(client, 'contacts', [
      'id',
      'account_id',
      'first_name',
      'preferred_name',
      'last_name',
      'middle_name',
      'salutation',
      'suffix',
      'birth_date',
      'gender',
      'pronouns',
      'phn_encrypted',
      'email',
      'phone',
      'mobile_phone',
      'job_title',
      'department',
      'preferred_contact_method',
      'do_not_email',
      'do_not_phone',
      'do_not_text',
      'do_not_voicemail',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'no_fixed_address',
      'notes',
      'tags',
      'is_active',
      'created_by',
      'modified_by',
    ], {
      id: contactId,
      account_id: uuid(row, 'account_id'),
      first_name: requiredText(row, 'first_name'),
      preferred_name: text(row, 'preferred_name'),
      last_name: requiredText(row, 'last_name'),
      middle_name: text(row, 'middle_name'),
      salutation: text(row, 'salutation'),
      suffix: text(row, 'suffix'),
      birth_date: text(row, 'birth_date'),
      gender: text(row, 'gender'),
      pronouns: text(row, 'pronouns'),
      phn_encrypted: text(row, 'phn') ? encrypt(requiredText(row, 'phn')) : null,
      email: text(row, 'email'),
      phone: text(row, 'phone'),
      mobile_phone: text(row, 'mobile_phone'),
      job_title: text(row, 'job_title'),
      department: text(row, 'department'),
      preferred_contact_method: text(row, 'preferred_contact_method'),
      do_not_email: boolValue(row, 'do_not_email') ?? false,
      do_not_phone: boolValue(row, 'do_not_phone') ?? false,
      do_not_text: boolValue(row, 'do_not_text') ?? false,
      do_not_voicemail: boolValue(row, 'do_not_voicemail') ?? false,
      address_line1: text(row, 'address_line1'),
      address_line2: text(row, 'address_line2'),
      city: text(row, 'city'),
      state_province: text(row, 'state_province'),
      postal_code: text(row, 'postal_code'),
      country: text(row, 'country'),
      no_fixed_address: boolValue(row, 'no_fixed_address') ?? false,
      notes: text(row, 'notes'),
      tags: listValue(row, 'tags'),
      is_active: boolValue(row, 'is_active') ?? true,
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    await syncContactRoles(client, contactId, listValue(row, 'roles'), options.actorId);
    results.contacts.imported += 1;
  }

  for (const row of safetyPlan.safeRows.cases) {
    await upsertById(client, 'cases', [
      'id',
      'case_number',
      'contact_id',
      'account_id',
      'case_type_id',
      'status_id',
      'priority',
      'title',
      'description',
      'source',
      'referral_source',
      'intake_date',
      'opened_date',
      'closed_date',
      'due_date',
      'outcome',
      'outcome_notes',
      'closure_reason',
      'requires_followup',
      'followup_date',
      'tags',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'case_id'),
      case_number: requiredText(row, 'case_number'),
      contact_id: requiredUuid(row, 'contact_id'),
      account_id: uuid(row, 'account_id'),
      case_type_id: requiredUuid(row, 'case_type_id'),
      status_id: requiredUuid(row, 'status_id'),
      priority: text(row, 'priority') ?? 'medium',
      title: requiredText(row, 'title'),
      description: text(row, 'description'),
      source: text(row, 'source'),
      referral_source: text(row, 'referral_source'),
      intake_date: text(row, 'intake_date'),
      opened_date: text(row, 'opened_date'),
      closed_date: text(row, 'closed_date'),
      due_date: text(row, 'due_date'),
      outcome: text(row, 'outcome'),
      outcome_notes: text(row, 'outcome_notes'),
      closure_reason: text(row, 'closure_reason'),
      requires_followup: boolValue(row, 'requires_followup') ?? false,
      followup_date: text(row, 'followup_date'),
      tags: listValue(row, 'tags'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.cases.imported += 1;
  }

  for (const row of safetyPlan.safeRows.case_type_assignments) {
    await upsertById(client, 'case_type_assignments', [
      'id',
      'case_id',
      'case_type_id',
      'is_primary',
      'sort_order',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'assignment_id'),
      case_id: requiredUuid(row, 'case_id'),
      case_type_id: requiredUuid(row, 'case_type_id'),
      is_primary: boolValue(row, 'is_primary') ?? false,
      sort_order: intValue(row, 'sort_order') ?? 0,
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.case_type_assignments.imported += 1;
  }

  for (const row of safetyPlan.safeRows.case_outcome_assignments) {
    await upsertById(client, 'case_outcome_assignments', [
      'id',
      'case_id',
      'outcome_value',
      'is_primary',
      'sort_order',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'assignment_id'),
      case_id: requiredUuid(row, 'case_id'),
      outcome_value: requiredText(row, 'outcome_value'),
      is_primary: boolValue(row, 'is_primary') ?? false,
      sort_order: intValue(row, 'sort_order') ?? 0,
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.case_outcome_assignments.imported += 1;
  }

  for (const row of safetyPlan.safeRows.events) {
    await upsertById(client, 'events', [
      'id',
      'organization_id',
      'name',
      'description',
      'event_type',
      'status',
      'start_date',
      'end_date',
      'location_name',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'capacity',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'event_id'),
      organization_id: options.organizationId,
      name: requiredText(row, 'event_name'),
      description: text(row, 'description'),
      event_type: text(row, 'event_type'),
      status: text(row, 'status') ?? 'planned',
      start_date: requiredText(row, 'start_date'),
      end_date: requiredText(row, 'end_date'),
      location_name: text(row, 'location_name'),
      address_line1: text(row, 'address_line1'),
      address_line2: text(row, 'address_line2'),
      city: text(row, 'city'),
      state_province: text(row, 'state_province'),
      postal_code: text(row, 'postal_code'),
      country: text(row, 'country'),
      capacity: intValue(row, 'capacity'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.events.imported += 1;
  }

  for (const row of safetyPlan.safeRows.event_occurrences) {
    await upsertById(client, 'event_occurrences', [
      'id',
      'event_id',
      'organization_id',
      'sequence_index',
      'scheduled_start_date',
      'scheduled_end_date',
      'start_date',
      'end_date',
      'status',
      'event_name',
      'description',
      'location_name',
      'capacity',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'occurrence_id'),
      event_id: requiredUuid(row, 'event_id'),
      organization_id: options.organizationId,
      sequence_index: intValue(row, 'sequence_index') ?? 0,
      scheduled_start_date: requiredText(row, 'scheduled_start_date'),
      scheduled_end_date: requiredText(row, 'scheduled_end_date'),
      start_date: requiredText(row, 'start_date'),
      end_date: requiredText(row, 'end_date'),
      status: text(row, 'status') ?? 'planned',
      event_name: requiredText(row, 'event_name'),
      description: text(row, 'description'),
      location_name: text(row, 'location_name'),
      capacity: intValue(row, 'capacity'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.event_occurrences.imported += 1;
  }

  for (const row of safetyPlan.safeRows.event_registrations) {
    await upsertById(client, 'event_registrations', [
      'id',
      'event_id',
      'occurrence_id',
      'contact_id',
      'registration_status',
      'checked_in',
      'check_in_time',
      'notes',
    ], {
      id: requiredUuid(row, 'registration_id'),
      event_id: requiredUuid(row, 'event_id'),
      occurrence_id: requiredUuid(row, 'occurrence_id'),
      contact_id: requiredUuid(row, 'contact_id'),
      registration_status: text(row, 'registration_status') ?? 'confirmed',
      checked_in: boolValue(row, 'checked_in') ?? false,
      check_in_time: text(row, 'check_in_time'),
      notes: text(row, 'notes'),
    });
    results.event_registrations.imported += 1;
  }

  for (const row of safetyPlan.safeRows.activities) {
    const regardingId = uuid(row, 'case_id') ?? uuid(row, 'contact_id') ?? uuid(row, 'account_id') ?? uuid(row, 'event_id');
    const regardingType =
      uuid(row, 'case_id') ? 'case' : uuid(row, 'contact_id') ? 'contact' : uuid(row, 'account_id') ? 'account' : uuid(row, 'event_id') ? 'event' : null;
    await upsertById(client, 'activities', [
      'id',
      'activity_type',
      'subject',
      'description',
      'activity_date',
      'regarding_type',
      'regarding_id',
      'created_by',
    ], {
      id: requiredUuid(row, 'activity_id'),
      activity_type: requiredText(row, 'activity_type'),
      subject: textMax(row, 'subject', 255),
      description: text(row, 'description'),
      activity_date: requiredText(row, 'activity_date'),
      regarding_type: regardingType,
      regarding_id: regardingId,
      created_by: options.actorId,
    }, ['activity_type', 'subject', 'description', 'activity_date', 'regarding_type', 'regarding_id']);
    results.activities.imported += 1;
  }

  for (const row of safetyPlan.safeRows.activity_events) {
    await upsertById(client, 'activity_events', [
      'id',
      'organization_id',
      'activity_type',
      'title',
      'description',
      'actor_name',
      'entity_type',
      'entity_id',
      'related_entity_type',
      'related_entity_id',
      'metadata',
      'occurred_at',
      'source_table',
      'source_record_id',
    ], {
      id: requiredUuid(row, 'activity_event_id'),
      organization_id: options.organizationId,
      activity_type: requiredText(row, 'activity_type'),
      title: requiredTextMax(row, 'title', 255),
      description: text(row, 'description') ?? '',
      actor_name: text(row, 'actor_name'),
      entity_type: requiredText(row, 'entity_type'),
      entity_id: requiredUuid(row, 'entity_id'),
      related_entity_type: text(row, 'related_entity_type'),
      related_entity_id: uuid(row, 'related_entity_id'),
      metadata: JSON.stringify(jsonValue(row, 'metadata')),
      occurred_at: requiredText(row, 'occurred_at'),
      source_table: text(row, 'source_table'),
      source_record_id: uuid(row, 'source_record_id'),
    });
    results.activity_events.imported += 1;
  }

  for (const row of safetyPlan.safeRows.donations) {
    await upsertById(client, 'donations', [
      'id',
      'donation_number',
      'account_id',
      'contact_id',
      'amount',
      'currency',
      'donation_date',
      'payment_method',
      'payment_status',
      'transaction_id',
      'campaign_name',
      'designation',
      'is_recurring',
      'recurring_frequency',
      'notes',
      'receipt_sent',
      'receipt_sent_date',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'donation_id'),
      donation_number: text(row, 'donation_number'),
      account_id: uuid(row, 'account_id'),
      contact_id: uuid(row, 'contact_id'),
      amount: numberValue(row, 'amount') ?? 0,
      currency: text(row, 'currency') ?? 'CAD',
      donation_date: requiredText(row, 'donation_date'),
      payment_method: text(row, 'payment_method'),
      payment_status: text(row, 'payment_status') ?? 'completed',
      transaction_id: text(row, 'transaction_id'),
      campaign_name: text(row, 'campaign_name'),
      designation: text(row, 'designation'),
      is_recurring: boolValue(row, 'is_recurring') ?? false,
      recurring_frequency: text(row, 'recurring_frequency'),
      notes: text(row, 'notes'),
      receipt_sent: boolValue(row, 'receipt_sent') ?? false,
      receipt_sent_date: text(row, 'receipt_sent_date'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.donations.imported += 1;
  }

  for (const row of safetyPlan.safeRows.volunteers) {
    await upsertById(client, 'volunteers', [
      'id',
      'contact_id',
      'volunteer_status',
      'skills',
      'availability',
      'availability_status',
      'availability_notes',
      'emergency_contact_name',
      'emergency_contact_phone',
      'background_check_date',
      'background_check_status',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'volunteer_id'),
      contact_id: requiredUuid(row, 'contact_id'),
      volunteer_status: text(row, 'availability_status') ?? 'available',
      skills: listValue(row, 'skills'),
      availability: text(row, 'availability_notes'),
      availability_status: text(row, 'availability_status') ?? 'available',
      availability_notes: text(row, 'availability_notes'),
      emergency_contact_name: text(row, 'emergency_contact_name'),
      emergency_contact_phone: text(row, 'emergency_contact_phone'),
      background_check_date: text(row, 'background_check_date'),
      background_check_status: text(row, 'background_check_status'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.volunteers.imported += 1;
  }

  for (const row of safetyPlan.safeRows.volunteer_hours) {
    await upsertById(client, 'volunteer_hours', [
      'id',
      'volunteer_id',
      'activity_date',
      'hours_logged',
      'activity_type',
      'description',
      'notes',
      'verified',
    ], {
      id: requiredUuid(row, 'volunteer_hour_id'),
      volunteer_id: requiredUuid(row, 'volunteer_id'),
      activity_date: requiredText(row, 'activity_date'),
      hours_logged: numberValue(row, 'hours_logged') ?? 0,
      activity_type: textMax(row, 'activity_type', 100),
      description: text(row, 'description'),
      notes: text(row, 'notes'),
      verified: boolValue(row, 'verified') ?? false,
    });
    results.volunteer_hours.imported += 1;
  }

  for (const row of safetyPlan.safeRows.follow_ups) {
    await upsertById(client, 'follow_ups', [
      'id',
      'organization_id',
      'entity_type',
      'entity_id',
      'title',
      'description',
      'scheduled_date',
      'scheduled_time',
      'frequency',
      'frequency_end_date',
      'method',
      'status',
      'completed_date',
      'completed_notes',
      'assigned_to',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'follow_up_id'),
      organization_id: options.organizationId,
      entity_type: requiredText(row, 'entity_type'),
      entity_id: requiredUuid(row, 'entity_id'),
      title: requiredText(row, 'title'),
      description: text(row, 'description'),
      scheduled_date: requiredText(row, 'scheduled_date'),
      scheduled_time: text(row, 'scheduled_time'),
      frequency: text(row, 'frequency') ?? 'once',
      frequency_end_date: text(row, 'frequency_end_date'),
      method: text(row, 'method'),
      status: text(row, 'status') ?? 'scheduled',
      completed_date: text(row, 'completed_date'),
      completed_notes: text(row, 'completed_notes'),
      assigned_to: uuid(row, 'assigned_to'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.follow_ups.imported += 1;
  }
};

const persistTargetProvenance = async (
  client: PoolClient,
  runId: string,
  bundle: LoadedCbisImportBundle,
  organizationId: string,
  safetyPlan: DuplicateSafetyPlan
): Promise<void> => {
  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    for (const row of safetyPlan.safeRows[entityType]) {
      const targetEntityId = requiredUuid(row, targetIdColumnFor(entityType));
      const provenanceSources = safetyPlan.safeProvenance.get(rowKey(entityType, targetEntityId)) ?? [];
      for (const source of provenanceSources) {
        await client.query(
          `
            INSERT INTO cbis_import_target_provenance (
              organization_id,
              target_entity_type,
              target_entity_id,
              source_file,
              source_table,
              source_row_id,
              source_row_hash,
              bundle_fingerprint,
              schema_bundle_version,
              first_import_run_id,
              last_import_run_id
            ) VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10::uuid, $10::uuid)
            ON CONFLICT (organization_id, target_entity_type, source_file, source_table, source_row_id) DO UPDATE SET
              target_entity_id = EXCLUDED.target_entity_id,
              source_row_hash = EXCLUDED.source_row_hash,
              bundle_fingerprint = EXCLUDED.bundle_fingerprint,
              schema_bundle_version = EXCLUDED.schema_bundle_version,
              last_import_run_id = EXCLUDED.last_import_run_id
          `,
          [
            organizationId,
            entityType,
            targetEntityId,
            source.source_file,
            source.source_table,
            source.source_row_id,
            source.source_row_hash,
            bundle.fingerprint,
            getSchemaBundleVersion(bundle),
            runId,
          ]
        );
      }
    }
  }
};

const persistAudit = async (
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

const buildResult = (
  runId: string,
  options: RunCbisImportOptions,
  bundle: LoadedCbisImportBundle,
  results: Record<CbisImportEntityType, CbisImportEntityResult>,
  issueCount: number,
  safetyPlan: DuplicateSafetyPlan,
  status: 'succeeded' | 'failed'
): CbisImportRunResult => {
  const readyRows = Object.values(results).reduce((sum, item) => sum + item.ready, 0);
  const importedRows = Object.values(results).reduce((sum, item) => sum + item.imported, 0);
  const heldOutRows = Object.values(results).reduce(
    (sum, item) => sum + item.invalid + item.review_required + item.skipped,
    0
  );

  return {
    run_id: runId,
    mode: options.mode,
    status,
    bundle_fingerprint: bundle.fingerprint,
    schema_bundle_version: getSchemaBundleVersion(bundle),
    per_entity: results,
    issue_count: issueCount,
    duplicate_safety: {
      duplicate_conflicts: safetyPlan.duplicateIssues.length,
      held_for_review: safetyPlan.heldKeys.size,
      idempotent_updates: safetyPlan.idempotentUpdates,
      provenance_conflicts: safetyPlan.provenanceConflicts,
    },
    reconciliation: {
      ready_rows: readyRows,
      imported_rows: importedRows,
      held_out_rows: heldOutRows,
      mapping_rows: bundle.entityMapRows.length,
      gap_rows: bundle.gapRows.length,
    },
  };
};

export class CbisImportService {
  constructor(private readonly pool: Pool = rawPool) {}

  async run(options: RunCbisImportOptions): Promise<CbisImportRunResult> {
    const bundle = await loadCbisImportBundle(options.bundleDir);
    const results = buildInitialEntityResults(bundle);
    const client = await this.pool.connect();
    let runId = '';
    let dryRunRequiredRunId: string | null = null;

    try {
      if (options.mode === 'apply') {
        if (!options.rollbackArtifactPath) {
          throw new Error('Apply mode requires --backup-path pointing at the pre-import backup artifact');
        }
        dryRunRequiredRunId = await findSuccessfulDryRun(client, bundle, options.organizationId);
        if (!dryRunRequiredRunId) {
          throw new Error('Apply mode requires a successful dry-run for the same bundle fingerprint and schema version');
        }
      }

      runId = await insertRun(client, bundle, options, 'started', dryRunRequiredRunId ?? undefined);

      await client.query('BEGIN');
      await setCurrentUserId(client, options.actorId, { local: true });
      const safetyPlan = await buildDuplicateSafetyPlan(client, bundle, options.organizationId);
      applyDuplicatePlanToResults(results, safetyPlan);
      await importReadyRows(client, options, results, safetyPlan);

      if (options.mode === 'dry-run') {
        await client.query('ROLLBACK');
        const issueCount = await persistAudit(client, runId, bundle, results, safetyPlan);
        await finishRun(client, runId, 'succeeded');
        return buildResult(runId, options, bundle, results, issueCount, safetyPlan, 'succeeded');
      }

      await persistTargetProvenance(client, runId, bundle, options.organizationId, safetyPlan);
      const issueCount = await persistAudit(client, runId, bundle, results, safetyPlan);
      await client.query('COMMIT');
      await finishRun(client, runId, 'succeeded');
      return buildResult(runId, options, bundle, results, issueCount, safetyPlan, 'succeeded');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback failures; the original error is more useful.
      }

      if (runId) {
        await finishRun(client, runId, 'failed', error instanceof Error ? error.message : String(error));
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
