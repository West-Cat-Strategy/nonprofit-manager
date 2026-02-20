-- Event reminder automations
-- Migration 046: Adds scheduled reminder automation storage and delivery linkage.

-- ============================================================================
-- Event reminder automations (per-event, multiple rows supported)
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_reminder_automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    timing_type VARCHAR(20) NOT NULL
      CHECK (timing_type IN ('relative', 'absolute')),
    relative_minutes_before INTEGER NULL
      CHECK (relative_minutes_before IS NULL OR relative_minutes_before > 0),
    absolute_send_at TIMESTAMP WITH TIME ZONE NULL,
    send_email BOOLEAN NOT NULL DEFAULT true,
    send_sms BOOLEAN NOT NULL DEFAULT true,
    custom_message VARCHAR(500) NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT true,
    processing_started_at TIMESTAMP WITH TIME ZONE NULL,
    attempted_at TIMESTAMP WITH TIME ZONE NULL,
    attempt_status VARCHAR(20) NULL
      CHECK (attempt_status IN ('sent', 'partial', 'failed', 'skipped', 'cancelled')),
    attempt_summary JSONB NULL,
    last_error TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id)
);

COMMENT ON TABLE event_reminder_automations IS 'Automated, user-scheduled reminder jobs for events';

-- Enforce exactly one timing input based on timing_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_reminder_automations_timing_check'
  ) THEN
    ALTER TABLE event_reminder_automations
      ADD CONSTRAINT event_reminder_automations_timing_check
      CHECK (
        (timing_type = 'relative' AND relative_minutes_before IS NOT NULL AND absolute_send_at IS NULL) OR
        (timing_type = 'absolute' AND absolute_send_at IS NOT NULL AND relative_minutes_before IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_reminder_automations_event
  ON event_reminder_automations(event_id, is_active);

CREATE INDEX IF NOT EXISTS idx_event_reminder_automations_absolute_pending
  ON event_reminder_automations(absolute_send_at)
  WHERE timing_type = 'absolute' AND attempted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_event_reminder_automations_processing
  ON event_reminder_automations(processing_started_at);

-- ============================================================================
-- Link delivery log rows to automation runs and trigger origin
-- ============================================================================
ALTER TABLE event_reminder_deliveries
  ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES event_reminder_automations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(20) NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_reminder_deliveries_trigger_type_check'
  ) THEN
    ALTER TABLE event_reminder_deliveries
      ADD CONSTRAINT event_reminder_deliveries_trigger_type_check
      CHECK (trigger_type IN ('manual', 'automated'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_reminder_deliveries_automation
  ON event_reminder_deliveries(automation_id);
