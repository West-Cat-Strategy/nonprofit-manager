-- Add public visibility toggle for events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);

COMMENT ON COLUMN events.is_public IS 'Whether this event is publicly visible for sharing/registration';
