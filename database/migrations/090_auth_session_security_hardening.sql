-- Migration 090: auth/session security hardening
-- Created: 2026-04-14
-- Description:
--   Add a schema-backed auth revision so role/password/deactivation changes can
--   invalidate outstanding staff JWT sessions.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_revision INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET auth_revision = 0
WHERE auth_revision IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_revision_non_negative'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_auth_revision_non_negative
      CHECK (auth_revision >= 0);
  END IF;
END $$;
