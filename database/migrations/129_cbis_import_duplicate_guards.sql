-- Migration 129: CBIS import duplicate guards
-- Adds cross-run source-to-target provenance so the staged importer can prove
-- reruns are idempotent and hold suspicious duplicate candidates for review.

CREATE TABLE IF NOT EXISTS cbis_import_target_provenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID NOT NULL,
  source_file TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_row_id TEXT NOT NULL,
  source_row_hash TEXT,
  bundle_fingerprint TEXT NOT NULL,
  schema_bundle_version TEXT NOT NULL,
  first_import_run_id UUID REFERENCES cbis_import_runs(id) ON DELETE SET NULL,
  last_import_run_id UUID REFERENCES cbis_import_runs(id) ON DELETE SET NULL,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbis_import_target_provenance_target
  ON cbis_import_target_provenance(organization_id, target_entity_type, target_entity_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cbis_import_target_provenance_source
  ON cbis_import_target_provenance(organization_id, target_entity_type, source_file, source_table, source_row_id);

CREATE INDEX IF NOT EXISTS idx_cbis_import_target_provenance_source_hash
  ON cbis_import_target_provenance(organization_id, target_entity_type, source_row_hash)
  WHERE source_row_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cbis_import_target_provenance_bundle
  ON cbis_import_target_provenance(bundle_fingerprint, schema_bundle_version);

CREATE INDEX IF NOT EXISTS idx_cbis_import_runs_apply_guard
  ON cbis_import_runs(organization_id, bundle_fingerprint, schema_bundle_version, mode, status)
  WHERE mode = 'apply';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_cbis_import_target_provenance_updated_at'
  ) THEN
    CREATE TRIGGER update_cbis_import_target_provenance_updated_at
      BEFORE UPDATE ON cbis_import_target_provenance
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE cbis_import_target_provenance IS
  'Cross-run CBIS source-to-target ledger used to prevent accidental duplicate live imports';
