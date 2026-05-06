-- Migration 121: Portal account scope
-- Created: 2026-05-05
-- Description:
--   * adds account scope to portal users and invitations
--   * backfills scope from linked contacts
--   * keeps legacy contactless/unscoped records inaccessible to tenant-scoped admin queries

ALTER TABLE portal_users
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE portal_invitations
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

UPDATE portal_users pu
SET account_id = c.account_id
FROM contacts c
WHERE c.id = pu.contact_id
  AND pu.account_id IS NULL
  AND c.account_id IS NOT NULL;

UPDATE portal_invitations pi
SET account_id = c.account_id
FROM contacts c
WHERE c.id = pi.contact_id
  AND pi.account_id IS NULL
  AND c.account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_users_account_email
  ON portal_users(account_id, lower(email))
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_users_account_created
  ON portal_users(account_id, created_at DESC)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_invitations_account_email
  ON portal_invitations(account_id, lower(email))
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_invitations_account_created
  ON portal_invitations(account_id, created_at DESC)
  WHERE account_id IS NOT NULL;

COMMENT ON COLUMN portal_users.account_id IS
  'Tenant scope for portal administration; null legacy rows are intentionally excluded from tenant-scoped admin queries unless a linked contact supplies scope';

COMMENT ON COLUMN portal_invitations.account_id IS
  'Tenant scope for portal administration; null legacy rows are intentionally excluded from tenant-scoped admin queries unless a linked contact supplies scope';
