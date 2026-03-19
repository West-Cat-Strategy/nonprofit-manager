-- Migration 082: backend runtime efficiency indexes
-- Created: 2026-03-19
-- Description: Adds composite indexes for follow-up list lookups and site analytics summary windows.

CREATE INDEX IF NOT EXISTS idx_follow_ups_org_schedule
  ON follow_ups(organization_id, scheduled_date ASC, scheduled_time ASC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follow_ups_org_entity_schedule
  ON follow_ups(organization_id, entity_type, entity_id, scheduled_date ASC, scheduled_time ASC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_analytics_site_created_at
  ON site_analytics(site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_analytics_site_event_created_at
  ON site_analytics(site_id, event_type, created_at DESC);
