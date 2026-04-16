-- Migration 091: Event occurrences, series enrollments, waitlists, and confirmation tracking

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS event_occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sequence_index INTEGER NOT NULL DEFAULT 0,
  scheduled_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'planned',
  event_name VARCHAR(255) NOT NULL,
  description TEXT,
  location_name VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  capacity INTEGER,
  registered_count INTEGER NOT NULL DEFAULT 0,
  attended_count INTEGER NOT NULL DEFAULT 0,
  waitlist_enabled BOOLEAN NOT NULL DEFAULT true,
  public_checkin_enabled BOOLEAN NOT NULL DEFAULT false,
  public_checkin_pin_hash TEXT,
  public_checkin_pin_rotated_at TIMESTAMP WITH TIME ZONE,
  is_exception BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_occurrences_status_check'
  ) THEN
    ALTER TABLE event_occurrences
      ADD CONSTRAINT event_occurrences_status_check
      CHECK (status IN ('planned', 'active', 'completed', 'cancelled', 'postponed'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_occurrences_event_sequence
  ON event_occurrences(event_id, sequence_index);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_occurrences_event_scheduled_start
  ON event_occurrences(event_id, scheduled_start_date);

CREATE INDEX IF NOT EXISTS idx_event_occurrences_start_date
  ON event_occurrences(start_date);

CREATE INDEX IF NOT EXISTS idx_event_occurrences_event_start
  ON event_occurrences(event_id, start_date);

CREATE INDEX IF NOT EXISTS idx_event_occurrences_public_checkin_enabled
  ON event_occurrences(public_checkin_enabled, start_date)
  WHERE public_checkin_enabled = true;

CREATE TABLE IF NOT EXISTS event_series_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  registration_status VARCHAR(50) NOT NULL DEFAULT 'registered',
  enrollment_scope VARCHAR(20) NOT NULL DEFAULT 'series',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_event_series_enrollments UNIQUE (event_id, contact_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_series_enrollments_status_check'
  ) THEN
    ALTER TABLE event_series_enrollments
      ADD CONSTRAINT event_series_enrollments_status_check
      CHECK (registration_status IN ('registered', 'waitlisted', 'cancelled', 'confirmed', 'no_show'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_series_enrollments_scope_check'
  ) THEN
    ALTER TABLE event_series_enrollments
      ADD CONSTRAINT event_series_enrollments_scope_check
      CHECK (enrollment_scope IN ('series', 'occurrence'));
  END IF;
END $$;

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS occurrence_id UUID REFERENCES event_occurrences(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS series_enrollment_id UUID REFERENCES event_series_enrollments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS waitlist_position INTEGER,
  ADD COLUMN IF NOT EXISTS confirmation_email_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS confirmation_email_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_registrations_confirmation_email_status_check'
  ) THEN
    ALTER TABLE event_registrations
      ADD CONSTRAINT event_registrations_confirmation_email_status_check
      CHECK (
        confirmation_email_status IS NULL
        OR confirmation_email_status IN ('pending', 'sent', 'failed', 'skipped')
      );
  END IF;
END $$;

ALTER TABLE event_reminder_automations
  ADD COLUMN IF NOT EXISTS occurrence_id UUID REFERENCES event_occurrences(id) ON DELETE CASCADE;

ALTER TABLE event_reminder_deliveries
  ADD COLUMN IF NOT EXISTS occurrence_id UUID REFERENCES event_occurrences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_reminder_automations_occurrence
  ON event_reminder_automations(occurrence_id, is_active);

CREATE INDEX IF NOT EXISTS idx_event_reminder_deliveries_occurrence
  ON event_reminder_deliveries(occurrence_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS event_confirmation_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  occurrence_id UUID REFERENCES event_occurrences(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,
  delivery_status VARCHAR(20) NOT NULL,
  error_message TEXT,
  message_preview VARCHAR(255),
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_confirmation_deliveries_status_check'
  ) THEN
    ALTER TABLE event_confirmation_deliveries
      ADD CONSTRAINT event_confirmation_deliveries_status_check
      CHECK (delivery_status IN ('sent', 'failed', 'skipped'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_confirmation_deliveries_registration
  ON event_confirmation_deliveries(registration_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_confirmation_deliveries_occurrence
  ON event_confirmation_deliveries(occurrence_id, sent_at DESC);

WITH seeded_occurrences AS (
  INSERT INTO event_occurrences (
    event_id,
    sequence_index,
    scheduled_start_date,
    scheduled_end_date,
    start_date,
    end_date,
    status,
    event_name,
    description,
    location_name,
    address_line1,
    address_line2,
    city,
    state_province,
    postal_code,
    country,
    capacity,
    registered_count,
    attended_count,
    waitlist_enabled,
    public_checkin_enabled,
    public_checkin_pin_hash,
    public_checkin_pin_rotated_at,
    created_at,
    updated_at,
    created_by,
    modified_by
  )
  SELECT
    e.id,
    0,
    e.start_date,
    e.end_date,
    e.start_date,
    e.end_date,
    e.status,
    e.name,
    e.description,
    e.location_name,
    e.address_line1,
    e.address_line2,
    e.city,
    e.state_province,
    e.postal_code,
    e.country,
    e.capacity,
    COALESCE(e.registered_count, 0),
    COALESCE(e.attended_count, 0),
    COALESCE(e.waitlist_enabled, true),
    COALESCE(e.public_checkin_enabled, false),
    e.public_checkin_pin_hash,
    e.public_checkin_pin_rotated_at,
    e.created_at,
    e.updated_at,
    e.created_by,
    e.modified_by
  FROM events e
  LEFT JOIN event_occurrences existing
    ON existing.event_id = e.id
   AND existing.sequence_index = 0
  WHERE existing.id IS NULL
  RETURNING 1
)
SELECT COUNT(*) FROM seeded_occurrences;

UPDATE event_registrations er
SET occurrence_id = eo.id
FROM event_occurrences eo
WHERE eo.event_id = er.event_id
  AND eo.sequence_index = 0
  AND er.occurrence_id IS NULL;

UPDATE event_registrations er
SET confirmation_email_status = CASE
      WHEN er.registration_status IN ('registered', 'confirmed') THEN 'pending'
      ELSE 'skipped'
    END
WHERE er.confirmation_email_status IS NULL;

UPDATE event_reminder_automations era
SET occurrence_id = eo.id
FROM event_occurrences eo
WHERE eo.event_id = era.event_id
  AND eo.sequence_index = 0
  AND era.occurrence_id IS NULL;

UPDATE event_reminder_deliveries erd
SET occurrence_id = er.occurrence_id
FROM event_registrations er
WHERE er.id = erd.registration_id
  AND erd.occurrence_id IS NULL;

UPDATE event_occurrences eo
SET
  registered_count = counts.registered_count,
  attended_count = counts.attended_count
FROM (
  SELECT
    occurrence_id,
    COUNT(*) FILTER (WHERE registration_status IN ('registered', 'confirmed'))::int AS registered_count,
    COUNT(*) FILTER (WHERE checked_in = true)::int AS attended_count
  FROM event_registrations
  WHERE occurrence_id IS NOT NULL
  GROUP BY occurrence_id
) counts
WHERE counts.occurrence_id = eo.id;

ALTER TABLE event_registrations
  ALTER COLUMN occurrence_id SET NOT NULL;

ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_event_id_contact_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_registrations_occurrence_contact
  ON event_registrations(occurrence_id, contact_id);

CREATE INDEX IF NOT EXISTS idx_event_registrations_occurrence_created
  ON event_registrations(occurrence_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_registrations_occurrence_status
  ON event_registrations(occurrence_id, registration_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_registrations_waitlist_position
  ON event_registrations(occurrence_id, waitlist_position)
  WHERE registration_status = 'waitlisted';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_event_occurrences_updated_at'
  ) THEN
    CREATE TRIGGER update_event_occurrences_updated_at
      BEFORE UPDATE ON event_occurrences
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_event_series_enrollments_updated_at'
  ) THEN
    CREATE TRIGGER update_event_series_enrollments_updated_at
      BEFORE UPDATE ON event_series_enrollments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE event_occurrences IS 'Materialized event dates/instances for single and recurring event series';
COMMENT ON TABLE event_series_enrollments IS 'Whole-series enrollment intent used to materialize registrations across future occurrences';
COMMENT ON TABLE event_confirmation_deliveries IS 'Delivery history for event confirmation emails with QR check-in details';
