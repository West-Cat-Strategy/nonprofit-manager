-- Add saved_report_public_snapshots table for file-based public link snapshots

CREATE TABLE IF NOT EXISTS saved_report_public_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked', 'purged')),
  rows_count INTEGER NOT NULL DEFAULT 0,
  csv_file_path TEXT,
  xlsx_file_path TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  retention_until TIMESTAMP WITH TIME ZONE,
  purged_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_report_public_snapshots_saved_report
  ON saved_report_public_snapshots(saved_report_id);

CREATE INDEX IF NOT EXISTS idx_saved_report_public_snapshots_status
  ON saved_report_public_snapshots(status);

CREATE INDEX IF NOT EXISTS idx_saved_report_public_snapshots_retention
  ON saved_report_public_snapshots(retention_until)
  WHERE retention_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_report_public_snapshots_created_at
  ON saved_report_public_snapshots(created_at DESC);

CREATE OR REPLACE FUNCTION update_saved_report_public_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_saved_report_public_snapshots_updated_at
  ON saved_report_public_snapshots;

CREATE TRIGGER trigger_update_saved_report_public_snapshots_updated_at
BEFORE UPDATE ON saved_report_public_snapshots
FOR EACH ROW
EXECUTE FUNCTION update_saved_report_public_snapshots_updated_at();
