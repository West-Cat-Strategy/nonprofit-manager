-- Migration 084: CBIS unified dataset import staging and provenance

CREATE TABLE IF NOT EXISTS cbis_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_dir TEXT NOT NULL,
    source_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
    dry_run BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'running'
      CHECK (status IN ('running', 'completed', 'failed', 'rolled_back', 'dry_run')),
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbis_import_jobs_status_started
    ON cbis_import_jobs(status, started_at DESC);

CREATE TABLE IF NOT EXISTS cbis_import_cluster_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id TEXT NOT NULL,
    entity_type VARCHAR(20) NOT NULL
      CHECK (entity_type IN ('account', 'contact', 'case', 'event', 'volunteer')),
    entity_id UUID NOT NULL,
    source_table TEXT,
    source_row_id TEXT,
    source_row_number INTEGER,
    source_label TEXT,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1,
    notes TEXT,
    job_id UUID REFERENCES cbis_import_jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cbis_import_cluster_entity UNIQUE (cluster_id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_cbis_import_cluster_entities_cluster
    ON cbis_import_cluster_entities(cluster_id, entity_type);

CREATE TABLE IF NOT EXISTS cbis_import_source_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES cbis_import_jobs(id) ON DELETE CASCADE,
    source_table TEXT NOT NULL,
    source_file TEXT NOT NULL,
    source_row_id TEXT NOT NULL,
    source_row_number INTEGER NOT NULL,
    parent_source_row_id TEXT,
    cluster_id TEXT,
    record_type TEXT,
    row_payload JSONB NOT NULL,
    target_entity_type VARCHAR(20)
      CHECK (target_entity_type IN ('account', 'contact', 'case', 'event', 'volunteer', 'donation', 'note', 'service', 'milestone', 'follow_up', 'activity')),
    target_entity_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'staged'
      CHECK (status IN ('staged', 'processed', 'skipped', 'failed')),
    warnings TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cbis_import_source_row UNIQUE (source_table, source_file, source_row_id)
);

CREATE INDEX IF NOT EXISTS idx_cbis_import_source_rows_cluster
    ON cbis_import_source_rows(cluster_id, source_table);

CREATE INDEX IF NOT EXISTS idx_cbis_import_source_rows_target
    ON cbis_import_source_rows(target_entity_type, target_entity_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_cbis_import_jobs_updated_at'
    ) THEN
        CREATE TRIGGER update_cbis_import_jobs_updated_at
            BEFORE UPDATE ON cbis_import_jobs
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_cbis_import_cluster_entities_updated_at'
    ) THEN
        CREATE TRIGGER update_cbis_import_cluster_entities_updated_at
            BEFORE UPDATE ON cbis_import_cluster_entities
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_cbis_import_source_rows_updated_at'
    ) THEN
        CREATE TRIGGER update_cbis_import_source_rows_updated_at
            BEFORE UPDATE ON cbis_import_source_rows
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMENT ON TABLE cbis_import_jobs IS 'Execution history for CBIS unified dataset imports';
COMMENT ON TABLE cbis_import_cluster_entities IS 'Persistent mapping from unified clusters to canonical app entities';
COMMENT ON TABLE cbis_import_source_rows IS 'Raw CBIS source rows staged with provenance and target mapping';
