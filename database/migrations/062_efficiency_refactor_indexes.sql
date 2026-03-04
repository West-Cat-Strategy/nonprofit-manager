-- Migration: P4-T9B efficiency refactor indexes
-- Date: 2026-03-03
-- Purpose: Add targeted opportunities + meetings hot-path indexes.

CREATE INDEX IF NOT EXISTS idx_opportunities_org_stage_updated_at
  ON opportunities (organization_id, stage_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_opportunities_org_status_updated_at
  ON opportunities (organization_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_opportunities_org_assigned_to_updated_at
  ON opportunities (organization_id, assigned_to, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_meeting_position
  ON meeting_agenda_items (meeting_id, position);
