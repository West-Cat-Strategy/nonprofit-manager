-- Add recurring event fields
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20),
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE;

-- Guardrails for recurrence data quality
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_recurrence_pattern_check'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_recurrence_pattern_check
    CHECK (
      recurrence_pattern IS NULL
      OR recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_recurrence_interval_check'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_recurrence_interval_check
    CHECK (recurrence_interval IS NULL OR recurrence_interval > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_is_recurring ON events(is_recurring);
