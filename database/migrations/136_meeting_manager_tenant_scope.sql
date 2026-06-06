-- Migration 136: Meeting manager tenant scope
-- Created: 2026-06-05
-- Description:
--   Adds organization ownership to committees and meetings. Legacy unscoped rows
--   remain inaccessible to tenant-scoped app queries until explicitly repaired.

ALTER TABLE committees
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE committees
  DROP CONSTRAINT IF EXISTS committees_name_key;

WITH single_org AS (
  SELECT MIN(id) AS organization_id, COUNT(*) AS organization_count
  FROM accounts
  WHERE account_type = 'organization'
    AND COALESCE(is_active, true) = true
)
UPDATE committees c
SET organization_id = single_org.organization_id
FROM single_org
WHERE c.organization_id IS NULL
  AND single_org.organization_count = 1;

UPDATE meetings m
SET organization_id = c.organization_id
FROM committees c
WHERE c.id = m.committee_id
  AND m.organization_id IS NULL
  AND c.organization_id IS NOT NULL;

WITH single_org AS (
  SELECT MIN(id) AS organization_id, COUNT(*) AS organization_count
  FROM accounts
  WHERE account_type = 'organization'
    AND COALESCE(is_active, true) = true
)
UPDATE meetings m
SET organization_id = single_org.organization_id
FROM single_org
WHERE m.organization_id IS NULL
  AND single_org.organization_count = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_committees_org_name_unique
  ON committees(organization_id, name)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_committees_org
  ON committees(organization_id, is_system DESC, name ASC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_org_starts
  ON meetings(organization_id, starts_at DESC, id)
  WHERE organization_id IS NOT NULL;

INSERT INTO committees (organization_id, name, description, is_system)
SELECT a.id, defaults.name, defaults.description, true
FROM accounts a
CROSS JOIN (
  VALUES
    ('Staff', 'Default staff committee'),
    ('Board of Directors', 'Default board committee')
) AS defaults(name, description)
WHERE a.account_type = 'organization'
  AND COALESCE(a.is_active, true) = true
ON CONFLICT DO NOTHING;
