-- Migration 060: Add saved report sharing columns used by SavedReportService

ALTER TABLE saved_reports
  ADD COLUMN IF NOT EXISTS shared_with_users UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS shared_with_roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS public_token VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_saved_reports_public_token
  ON saved_reports (public_token)
  WHERE public_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_reports_shared_users
  ON saved_reports
  USING GIN (shared_with_users);

CREATE INDEX IF NOT EXISTS idx_saved_reports_shared_roles
  ON saved_reports
  USING GIN (shared_with_roles);
