-- Migration 136: Tenant-scoped organization branding
-- Created: 2026-06-05
-- Description:
--   Replaces the legacy singleton branding row with one row per organization.

CREATE TABLE IF NOT EXISTS organization_branding_scoped (
  organization_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO organization_branding_scoped (organization_id, config, created_at, updated_at)
SELECT
  a.id,
  COALESCE(singleton.config, '{}'::jsonb),
  NOW(),
  NOW()
FROM accounts a
LEFT JOIN LATERAL (
  SELECT config
  FROM organization_branding
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1
) singleton ON true
WHERE a.account_type = 'organization'
ON CONFLICT (organization_id) DO NOTHING;

DROP TABLE IF EXISTS organization_branding;

ALTER TABLE organization_branding_scoped
  RENAME TO organization_branding;

CREATE INDEX IF NOT EXISTS idx_organization_branding_updated_at
  ON organization_branding(updated_at DESC);
