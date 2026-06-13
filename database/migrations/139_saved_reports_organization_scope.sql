-- Migration 139: Add organization scope to saved reports

CREATE TABLE IF NOT EXISTS saved_reports_organization_scope_diagnostics (
  saved_report_id UUID PRIMARY KEY REFERENCES saved_reports(id) ON DELETE CASCADE,
  created_by UUID,
  reason TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE saved_reports
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

WITH creator_scope AS (
  SELECT
    sr.id AS saved_report_id,
    MIN(uaa.account_id::text)::uuid AS organization_id,
    COUNT(DISTINCT uaa.account_id) AS organization_count
  FROM saved_reports sr
  INNER JOIN user_account_access uaa
    ON uaa.user_id = sr.created_by
   AND uaa.is_active = true
  INNER JOIN accounts a
    ON a.id = uaa.account_id
   AND a.account_type = 'organization'
   AND COALESCE(a.is_active, true) = true
  WHERE sr.organization_id IS NULL
  GROUP BY sr.id
),
deterministic_scope AS (
  SELECT saved_report_id, organization_id
  FROM creator_scope
  WHERE organization_count = 1
)
UPDATE saved_reports sr
SET organization_id = deterministic_scope.organization_id
FROM deterministic_scope
WHERE sr.id = deterministic_scope.saved_report_id
  AND sr.organization_id IS NULL;

WITH creator_scope AS (
  SELECT
    sr.id AS saved_report_id,
    COUNT(DISTINCT uaa.account_id) AS organization_count
  FROM saved_reports sr
  LEFT JOIN user_account_access uaa
    ON uaa.user_id = sr.created_by
   AND uaa.is_active = true
  LEFT JOIN accounts a
    ON a.id = uaa.account_id
   AND a.account_type = 'organization'
   AND COALESCE(a.is_active, true) = true
  WHERE sr.organization_id IS NULL
  GROUP BY sr.id
)
INSERT INTO saved_reports_organization_scope_diagnostics (saved_report_id, created_by, reason)
SELECT
  sr.id,
  sr.created_by,
  CASE
    WHEN sr.created_by IS NULL THEN 'saved_report_has_no_creator'
    WHEN COALESCE(creator_scope.organization_count, 0) = 0 THEN 'creator_has_no_active_organization_access'
    ELSE 'creator_has_multiple_active_organization_access_rows'
  END
FROM saved_reports sr
LEFT JOIN creator_scope ON creator_scope.saved_report_id = sr.id
WHERE sr.organization_id IS NULL
ON CONFLICT (saved_report_id) DO UPDATE
SET created_by = EXCLUDED.created_by,
    reason = EXCLUDED.reason,
    detected_at = CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_saved_reports_organization_updated
  ON saved_reports (organization_id, updated_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_reports_organization_entity
  ON saved_reports (organization_id, entity)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_reports_organization_public
  ON saved_reports (organization_id, is_public)
  WHERE organization_id IS NOT NULL AND is_public = TRUE;

COMMENT ON COLUMN saved_reports.organization_id IS
  'Organization scope for saved report visibility, sharing, updates, deletion, and public snapshots.';

COMMENT ON TABLE saved_reports_organization_scope_diagnostics IS
  'Rows that could not be deterministically assigned an organization during saved report tenancy backfill.';
