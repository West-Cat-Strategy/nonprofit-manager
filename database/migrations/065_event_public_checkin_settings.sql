-- Migration 065: Public event check-in kiosk settings

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS public_checkin_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_checkin_pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS public_checkin_pin_rotated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_events_public_checkin_enabled_start
  ON events (public_checkin_enabled, start_date)
  WHERE public_checkin_enabled = true;

COMMENT ON COLUMN events.public_checkin_enabled IS 'Controls whether public kiosk check-in is enabled for the event';
COMMENT ON COLUMN events.public_checkin_pin_hash IS 'bcrypt hash for staff-issued public kiosk PIN';
COMMENT ON COLUMN events.public_checkin_pin_rotated_at IS 'Timestamp of last kiosk PIN rotation';
