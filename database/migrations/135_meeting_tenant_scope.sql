-- Scope meeting manager records to an organization tenant.

ALTER TABLE committees
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

UPDATE meetings meeting
SET organization_id = COALESCE(
  meeting.organization_id,
  (
    SELECT access.account_id
    FROM user_account_access access
    INNER JOIN accounts account ON account.id = access.account_id
    WHERE access.user_id = meeting.created_by
      AND access.is_active = true
      AND account.account_type = 'organization'
      AND COALESCE(account.is_active, true) = true
    ORDER BY access.granted_at ASC, access.account_id ASC
    LIMIT 1
  ),
  (
    SELECT account.id
    FROM accounts account
    WHERE account.account_type = 'organization'
      AND COALESCE(account.is_active, true) = true
    ORDER BY account.created_at ASC, account.account_name ASC
    LIMIT 1
  )
)
WHERE meeting.organization_id IS NULL;

ALTER TABLE meetings
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_committees_organization
  ON committees(organization_id);

CREATE INDEX IF NOT EXISTS idx_meetings_organization
  ON meetings(organization_id);

CREATE INDEX IF NOT EXISTS idx_meetings_organization_starts_at
  ON meetings(organization_id, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_meetings_organization_committee
  ON meetings(organization_id, committee_id);
