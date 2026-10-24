-- Migration 141: Public report token SHA-256 hash at rest
-- Created: 2026-10-11
-- Description:
--   * adds public_token_hash column to saved_reports
--   * backfills SHA-256 hashes for existing plaintext public_tokens
--   * creates a unique lookup index on public_token_hash

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE saved_reports
  ADD COLUMN IF NOT EXISTS public_token_hash VARCHAR(64);

UPDATE saved_reports
SET public_token_hash = encode(digest(public_token, 'sha256'), 'hex')
WHERE public_token_hash IS NULL
  AND public_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_reports_public_token_hash
  ON saved_reports(public_token_hash)
  WHERE public_token_hash IS NOT NULL;

COMMENT ON COLUMN saved_reports.public_token_hash IS
  'SHA-256 hash of the public report share token used for lookup and authentication';
