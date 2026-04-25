-- Migration 105: Server-backed queue view definitions
-- Created: 2026-04-25
-- Description:
--   * promotes reusable queue filters from local-only UI state into owner-scoped records

CREATE TABLE IF NOT EXISTS queue_view_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  surface VARCHAR(60) NOT NULL,
  name VARCHAR(255) NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_limit INTEGER NOT NULL DEFAULT 25,
  dashboard_behavior JSONB NOT NULL DEFAULT '{}'::jsonb,
  permission_scope TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT queue_view_definitions_surface_check CHECK (
    surface IN ('cases', 'portal_appointments', 'portal_conversations', 'workbench')
  ),
  CONSTRAINT queue_view_definitions_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT queue_view_definitions_row_limit_check CHECK (row_limit BETWEEN 1 AND 250)
);

CREATE INDEX IF NOT EXISTS idx_queue_view_definitions_owner_surface
  ON queue_view_definitions(owner_user_id, surface, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_queue_view_definitions_surface_status
  ON queue_view_definitions(surface, status, updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_queue_view_definitions_updated_at'
  ) THEN
    CREATE TRIGGER update_queue_view_definitions_updated_at
      BEFORE UPDATE ON queue_view_definitions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE queue_view_definitions IS
  'Owner-scoped saved operational queue definitions for list and workbench entry points; permission_scope is descriptive in v1';
