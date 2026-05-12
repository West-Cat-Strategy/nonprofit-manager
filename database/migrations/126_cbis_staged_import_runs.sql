-- Migration 126: CBIS staged import run audit tables
-- Stores prepared-bundle provenance, dry-run/apply summaries, row issues, and
-- source-to-target mapping without reviving the retired app-specific importer.

DO $$
DECLARE
  legacy_row_count BIGINT := 0;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cbis_import_source_rows'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cbis_import_source_rows'
      AND column_name = 'import_run_id'
  ) THEN
    SELECT COUNT(*) INTO legacy_row_count
    FROM public.cbis_import_source_rows;

    IF legacy_row_count > 0 THEN
      RAISE EXCEPTION
        'Cannot create CBIS staged import ledger while legacy cbis_import_source_rows contains % rows; archive or clear legacy staging rows before applying migration 126',
        legacy_row_count;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'cbis_import_source_rows_legacy_empty'
    ) THEN
      RAISE EXCEPTION
        'Cannot rename empty legacy cbis_import_source_rows because cbis_import_source_rows_legacy_empty already exists';
    END IF;

    ALTER TABLE public.cbis_import_source_rows
      RENAME TO cbis_import_source_rows_legacy_empty;

    ALTER INDEX IF EXISTS public.cbis_import_source_rows_pkey
      RENAME TO cbis_import_source_rows_legacy_empty_pkey;
    ALTER INDEX IF EXISTS public.idx_cbis_import_source_rows_cluster
      RENAME TO idx_cbis_import_source_rows_legacy_empty_cluster;
    ALTER INDEX IF EXISTS public.idx_cbis_import_source_rows_target
      RENAME TO idx_cbis_import_source_rows_legacy_empty_target;
    ALTER INDEX IF EXISTS public.uq_cbis_import_source_row
      RENAME TO uq_cbis_import_source_rows_legacy_empty_row;

    COMMENT ON TABLE public.cbis_import_source_rows_legacy_empty IS
      'Empty legacy CBIS import source-row staging table retained by migration 126 before creating the run-ledger source-row table';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cbis_import_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('dry-run', 'apply')),
  status VARCHAR(30) NOT NULL CHECK (
    status IN ('started', 'succeeded', 'failed', 'rolled_back')
  ),
  bundle_path TEXT NOT NULL,
  bundle_fingerprint TEXT NOT NULL,
  schema_bundle_version TEXT NOT NULL,
  schema_bundle JSONB NOT NULL DEFAULT '{}'::jsonb,
  import_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  readiness_report_path TEXT,
  rollback_artifact_path TEXT,
  dry_run_required_run_id UUID REFERENCES cbis_import_runs(id) ON DELETE SET NULL,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbis_import_runs_org_created
  ON cbis_import_runs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cbis_import_runs_fingerprint_mode_status
  ON cbis_import_runs(bundle_fingerprint, schema_bundle_version, mode, status);

CREATE TABLE IF NOT EXISTS cbis_import_source_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_run_id UUID NOT NULL REFERENCES cbis_import_runs(id) ON DELETE CASCADE,
  source_file TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_row_id TEXT NOT NULL,
  source_row_number INTEGER,
  source_row_hash TEXT,
  cluster_id TEXT,
  row_status VARCHAR(30) NOT NULL DEFAULT 'staged',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (import_run_id, source_file, source_table, source_row_id)
);

CREATE INDEX IF NOT EXISTS idx_cbis_import_source_rows_run_status
  ON cbis_import_source_rows(import_run_id, row_status);

CREATE INDEX IF NOT EXISTS idx_cbis_import_source_rows_hash
  ON cbis_import_source_rows(source_row_hash);

CREATE TABLE IF NOT EXISTS cbis_import_entity_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_run_id UUID NOT NULL REFERENCES cbis_import_runs(id) ON DELETE CASCADE,
  source_file TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_row_id TEXT NOT NULL,
  source_row_hash TEXT,
  cluster_id TEXT,
  cluster_record_type TEXT,
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID,
  target_row_status VARCHAR(30) NOT NULL,
  derivation_reason TEXT,
  validation_errors TEXT,
  validation_warnings TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbis_import_entity_map_run_target
  ON cbis_import_entity_map(import_run_id, target_entity_type, target_entity_id);

CREATE INDEX IF NOT EXISTS idx_cbis_import_entity_map_source
  ON cbis_import_entity_map(import_run_id, source_file, source_table, source_row_id);

CREATE TABLE IF NOT EXISTS cbis_import_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_run_id UUID NOT NULL REFERENCES cbis_import_runs(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  gap_category TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  cluster_id TEXT,
  source_table TEXT,
  source_file TEXT,
  source_row_id TEXT,
  source_row_number INTEGER,
  source_row_hash TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbis_import_issues_run_category
  ON cbis_import_issues(import_run_id, gap_category, reason);

CREATE TABLE IF NOT EXISTS cbis_import_entity_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_run_id UUID NOT NULL REFERENCES cbis_import_runs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  ready_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  review_required_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (import_run_id, entity_type)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_cbis_import_runs_updated_at'
  ) THEN
    CREATE TRIGGER update_cbis_import_runs_updated_at
      BEFORE UPDATE ON cbis_import_runs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE cbis_import_runs IS
  'Operator-run ledger for CBIS prepared-bundle dry-runs and applies';
COMMENT ON TABLE cbis_import_source_rows IS
  'Source row provenance captured from prepared CBIS bundle maps and gap reports';
COMMENT ON TABLE cbis_import_entity_map IS
  'Prepared source-to-target entity mapping rows for CBIS imports';
COMMENT ON TABLE cbis_import_issues IS
  'Rows intentionally held out of live import because they are invalid, review-required, skipped, or unmapped';
COMMENT ON TABLE cbis_import_entity_counters IS
  'Per-entity staged and imported counters for CBIS import runs';
