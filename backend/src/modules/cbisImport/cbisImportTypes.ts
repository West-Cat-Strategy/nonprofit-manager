import type { CbisImportEntityType, CbisImportRow } from './cbisImportBundle';

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

export type Scalar = string | number | boolean | string[] | null;

export interface ImportProvenanceSource {
  source_file: string;
  source_table: string;
  source_row_id: string;
  source_row_hash: string | null;
}

export interface DuplicateIssue {
  entityType: CbisImportEntityType;
  targetEntityId: string | null;
  source: ImportProvenanceSource | null;
  reason: string;
  details: string;
  provenanceConflict: boolean;
}

export interface DuplicateSafetyPlan {
  duplicateIssues: DuplicateIssue[];
  heldKeys: Set<string>;
  safeRows: Record<CbisImportEntityType, CbisImportRow[]>;
  safeProvenance: Map<string, ImportProvenanceSource[]>;
  idempotentUpdates: number;
  provenanceConflicts: number;
}

export interface DependencyReference {
  entityType: CbisImportEntityType;
  targetEntityId: string;
  label: string;
}

export interface ExistingProvenanceRow {
  target_entity_type: string;
  target_entity_id: string;
  source_file: string;
  source_table: string;
  source_row_id: string;
  source_row_hash: string | null;
}
