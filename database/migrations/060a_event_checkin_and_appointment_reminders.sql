-- Migration 060: Event QR check-in metadata and appointment reminder infrastructure

-- -----------------------------------------------------------------------------
-- Event registration check-in metadata
-- -----------------------------------------------------------------------------
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS check_in_token UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS check_in_method VARCHAR(20) DEFAULT 'manual';

UPDATE event_registrations
SET check_in_token = uuid_generate_v4()
WHERE check_in_token IS NULL;

ALTER TABLE event_registrations
  ALTER COLUMN check_in_token SET NOT NULL,
  ALTER COLUMN check_in_method SET NOT NULL,
  ALTER COLUMN check_in_method SET DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_registrations_check_in_method_check'
  ) THEN
    ALTER TABLE event_registrations
      ADD CONSTRAINT event_registrations_check_in_method_check
      CHECK (check_in_method IN ('manual', 'qr'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_registrations_check_in_token
  ON event_registrations(check_in_token);

-- -----------------------------------------------------------------------------
-- Appointment check-in metadata
-- -----------------------------------------------------------------------------
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Appointment reminder queue and delivery history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_reminder_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  cadence_key VARCHAR(10) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  processing_started_at TIMESTAMP WITH TIME ZONE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  cancelled_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT appointment_reminder_jobs_cadence_check CHECK (cadence_key IN ('24h', '2h')),
  CONSTRAINT appointment_reminder_jobs_channel_check CHECK (channel IN ('email', 'sms')),
  CONSTRAINT appointment_reminder_jobs_status_check CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped', 'cancelled')),
  CONSTRAINT appointment_reminder_jobs_attempt_check CHECK (attempt_count >= 0),
  CONSTRAINT uq_appointment_reminder_jobs UNIQUE (appointment_id, cadence_key, channel)
);

CREATE TABLE IF NOT EXISTS appointment_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  job_id UUID REFERENCES appointment_reminder_jobs(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL,
  trigger_type VARCHAR(20) NOT NULL DEFAULT 'manual',
  recipient VARCHAR(255) NOT NULL,
  delivery_status VARCHAR(20) NOT NULL,
  error_message TEXT,
  message_preview VARCHAR(255),
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT appointment_reminder_deliveries_channel_check CHECK (channel IN ('email', 'sms')),
  CONSTRAINT appointment_reminder_deliveries_trigger_check CHECK (trigger_type IN ('manual', 'automated')),
  CONSTRAINT appointment_reminder_deliveries_status_check CHECK (delivery_status IN ('sent', 'failed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_jobs_due
  ON appointment_reminder_jobs(status, scheduled_for, processing_started_at);

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_jobs_processing
  ON appointment_reminder_jobs(processing_started_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_jobs_appointment
  ON appointment_reminder_jobs(appointment_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_deliveries_appointment
  ON appointment_reminder_deliveries(appointment_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_deliveries_job
  ON appointment_reminder_deliveries(job_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_appointment_reminder_jobs_updated_at'
  ) THEN
    CREATE TRIGGER update_appointment_reminder_jobs_updated_at
      BEFORE UPDATE ON appointment_reminder_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE appointment_reminder_jobs IS 'Reminder queue rows for confirmed appointments';
COMMENT ON TABLE appointment_reminder_deliveries IS 'Delivery history for appointment reminder sends';

-- -----------------------------------------------------------------------------
-- Backfill confirmed future appointment reminder jobs (24h + 2h, email + sms)
-- -----------------------------------------------------------------------------
INSERT INTO appointment_reminder_jobs (
  appointment_id,
  cadence_key,
  channel,
  scheduled_for,
  status
)
SELECT
  a.id,
  cadence.cadence_key,
  channel.channel,
  cadence.scheduled_for,
  'pending'
FROM appointments a
CROSS JOIN LATERAL (
  VALUES
    ('24h'::varchar, a.start_time - INTERVAL '24 hours'),
    ('2h'::varchar, a.start_time - INTERVAL '2 hours')
) AS cadence(cadence_key, scheduled_for)
CROSS JOIN (
  VALUES ('email'::varchar), ('sms'::varchar)
) AS channel(channel)
WHERE a.status = 'confirmed'
  AND a.start_time > NOW()
  AND cadence.scheduled_for > NOW()
ON CONFLICT (appointment_id, cadence_key, channel) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Seed default event reminder automations (24h + 2h) for future events that
-- do not already have active/pending automations.
-- -----------------------------------------------------------------------------
WITH eligible_events AS (
  SELECT e.id
  FROM events e
  WHERE e.status NOT IN ('cancelled', 'completed')
    AND e.start_date > NOW()
    AND NOT EXISTS (
      SELECT 1
      FROM event_reminder_automations era
      WHERE era.event_id = e.id
        AND era.is_active = true
        AND era.attempted_at IS NULL
    )
)
INSERT INTO event_reminder_automations (
  event_id,
  timing_type,
  relative_minutes_before,
  absolute_send_at,
  send_email,
  send_sms,
  custom_message,
  timezone,
  is_active,
  created_by,
  modified_by
)
SELECT
  ee.id,
  'relative',
  defaults.relative_minutes_before,
  NULL,
  true,
  true,
  NULL,
  'UTC',
  true,
  NULL,
  NULL
FROM eligible_events ee
CROSS JOIN (
  VALUES (1440), (120)
) AS defaults(relative_minutes_before);
