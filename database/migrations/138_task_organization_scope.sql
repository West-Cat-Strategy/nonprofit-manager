-- Migration 138: Add organization scope to tasks

CREATE TABLE IF NOT EXISTS task_organization_scope_diagnostics (
  task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  created_by UUID,
  related_to_type VARCHAR(50),
  related_to_id UUID,
  reason TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

WITH related_scope AS (
  SELECT
    t.id AS task_id,
    CASE
      WHEN t.related_to_type = 'account' THEN a.id
      WHEN t.related_to_type = 'contact' THEN c.account_id
      WHEN t.related_to_type = 'donation' THEN d.account_id
      WHEN t.related_to_type = 'volunteer' THEN vc.account_id
      ELSE NULL
    END AS organization_id
  FROM tasks t
  LEFT JOIN accounts a
    ON t.related_to_type = 'account'
   AND t.related_to_id = a.id
   AND a.account_type = 'organization'
   AND COALESCE(a.is_active, true) = true
  LEFT JOIN contacts c
    ON t.related_to_type = 'contact'
   AND t.related_to_id = c.id
  LEFT JOIN donations d
    ON t.related_to_type = 'donation'
   AND t.related_to_id = d.id
  LEFT JOIN volunteers v
    ON t.related_to_type = 'volunteer'
   AND t.related_to_id = v.id
  LEFT JOIN contacts vc
    ON vc.id = v.contact_id
  WHERE t.organization_id IS NULL
),
deterministic_related_scope AS (
  SELECT task_id, organization_id
  FROM related_scope
  WHERE organization_id IS NOT NULL
)
UPDATE tasks t
SET organization_id = deterministic_related_scope.organization_id
FROM deterministic_related_scope
WHERE t.id = deterministic_related_scope.task_id
  AND t.organization_id IS NULL;

WITH creator_scope AS (
  SELECT
    t.id AS task_id,
    MIN(uaa.account_id::text)::uuid AS organization_id,
    COUNT(DISTINCT uaa.account_id) AS organization_count
  FROM tasks t
  INNER JOIN user_account_access uaa
    ON uaa.user_id = t.created_by
   AND uaa.is_active = true
  INNER JOIN accounts a
    ON a.id = uaa.account_id
   AND a.account_type = 'organization'
   AND COALESCE(a.is_active, true) = true
  WHERE t.organization_id IS NULL
  GROUP BY t.id
),
deterministic_creator_scope AS (
  SELECT task_id, organization_id
  FROM creator_scope
  WHERE organization_count = 1
)
UPDATE tasks t
SET organization_id = deterministic_creator_scope.organization_id
FROM deterministic_creator_scope
WHERE t.id = deterministic_creator_scope.task_id
  AND t.organization_id IS NULL;

WITH creator_scope AS (
  SELECT
    t.id AS task_id,
    COUNT(DISTINCT uaa.account_id) AS organization_count
  FROM tasks t
  LEFT JOIN user_account_access uaa
    ON uaa.user_id = t.created_by
   AND uaa.is_active = true
  LEFT JOIN accounts a
    ON a.id = uaa.account_id
   AND a.account_type = 'organization'
   AND COALESCE(a.is_active, true) = true
  WHERE t.organization_id IS NULL
  GROUP BY t.id
)
INSERT INTO task_organization_scope_diagnostics (
  task_id,
  created_by,
  related_to_type,
  related_to_id,
  reason
)
SELECT
  t.id,
  t.created_by,
  t.related_to_type,
  t.related_to_id,
  CASE
    WHEN t.related_to_type IS NOT NULL THEN 'related_entity_has_no_deterministic_organization'
    WHEN t.created_by IS NULL THEN 'task_has_no_creator'
    WHEN COALESCE(creator_scope.organization_count, 0) = 0 THEN 'creator_has_no_active_organization_access'
    ELSE 'creator_has_multiple_active_organization_access_rows'
  END
FROM tasks t
LEFT JOIN creator_scope ON creator_scope.task_id = t.id
WHERE t.organization_id IS NULL
ON CONFLICT (task_id) DO UPDATE
SET created_by = EXCLUDED.created_by,
    related_to_type = EXCLUDED.related_to_type,
    related_to_id = EXCLUDED.related_to_id,
    reason = EXCLUDED.reason,
    detected_at = CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_tasks_organization_due_date
  ON tasks (organization_id, due_date)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_organization_status
  ON tasks (organization_id, status)
  WHERE organization_id IS NOT NULL;

COMMENT ON COLUMN tasks.organization_id IS
  'Active organization scope for task list, detail, lifecycle, and completion operations.';

COMMENT ON TABLE task_organization_scope_diagnostics IS
  'Rows that could not be deterministically assigned an organization during task tenancy backfill.';
