-- Migration 124: Tenant and portal session boundary remediation
-- Created: 2026-05-05
-- Description:
--   * adds account scope to provider, portal conversation, appointment, and reminder rows
--   * backfills scope from linked tenant-owned records where unambiguous
--   * adds portal user auth revision for session invalidation after password changes

ALTER TABLE external_service_providers
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE portal_threads
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE appointment_availability_slots
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE appointment_reminder_jobs
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE appointment_reminder_deliveries
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE portal_users
  ADD COLUMN IF NOT EXISTS auth_revision INTEGER NOT NULL DEFAULT 0;

UPDATE portal_users
SET auth_revision = 0
WHERE auth_revision IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portal_users_auth_revision_non_negative'
  ) THEN
    ALTER TABLE portal_users
      ADD CONSTRAINT portal_users_auth_revision_non_negative
      CHECK (auth_revision >= 0);
  END IF;
END $$;

WITH provider_accounts AS (
  SELECT
    esp.id AS provider_id,
    (ARRAY_AGG(DISTINCT c.account_id))[1] AS account_id,
    COUNT(DISTINCT c.account_id) AS account_count
  FROM external_service_providers esp
  JOIN case_services cs ON cs.external_service_provider_id = esp.id
  JOIN cases c ON c.id = cs.case_id
  WHERE c.account_id IS NOT NULL
  GROUP BY esp.id
)
UPDATE external_service_providers esp
SET account_id = provider_accounts.account_id
FROM provider_accounts
WHERE esp.id = provider_accounts.provider_id
  AND esp.account_id IS NULL
  AND provider_accounts.account_count = 1;

WITH thread_accounts AS (
  SELECT
    t.id AS thread_id,
    COALESCE(pu.account_id, c.account_id, ca.account_id) AS account_id
  FROM portal_threads t
  JOIN portal_users pu ON pu.id = t.portal_user_id
  LEFT JOIN contacts c ON c.id = t.contact_id
  LEFT JOIN cases ca ON ca.id = t.case_id
  WHERE t.account_id IS NULL
)
UPDATE portal_threads t
SET account_id = thread_accounts.account_id
FROM thread_accounts
WHERE t.id = thread_accounts.thread_id
  AND thread_accounts.account_id IS NOT NULL;

WITH appointment_accounts AS (
  SELECT
    a.id AS appointment_id,
    COALESCE(c.account_id, ca.account_id, s.account_id) AS account_id
  FROM appointments a
  JOIN contacts c ON c.id = a.contact_id
  LEFT JOIN cases ca ON ca.id = a.case_id
  LEFT JOIN appointment_availability_slots s ON s.id = a.slot_id
  WHERE a.account_id IS NULL
)
UPDATE appointments a
SET account_id = appointment_accounts.account_id
FROM appointment_accounts
WHERE a.id = appointment_accounts.appointment_id
  AND appointment_accounts.account_id IS NOT NULL;

WITH slot_accounts AS (
  SELECT
    s.id AS slot_id,
    COALESCE(
      c.account_id,
      (
        SELECT uaa.account_id
        FROM user_account_access uaa
        WHERE uaa.user_id = s.pointperson_user_id
          AND uaa.is_active = true
          AND (
            SELECT COUNT(DISTINCT scoped.account_id)
            FROM user_account_access scoped
            WHERE scoped.user_id = s.pointperson_user_id
              AND scoped.is_active = true
          ) = 1
        ORDER BY uaa.account_id::text ASC
        LIMIT 1
      ),
      (
        SELECT uaa.account_id
        FROM user_account_access uaa
        WHERE uaa.user_id = s.created_by
          AND uaa.is_active = true
          AND (
            SELECT COUNT(DISTINCT scoped.account_id)
            FROM user_account_access scoped
            WHERE scoped.user_id = s.created_by
              AND scoped.is_active = true
          ) = 1
        ORDER BY uaa.account_id::text ASC
        LIMIT 1
      )
    ) AS account_id
  FROM appointment_availability_slots s
  LEFT JOIN cases c ON c.id = s.case_id
)
UPDATE appointment_availability_slots s
SET account_id = slot_accounts.account_id
FROM slot_accounts
WHERE s.id = slot_accounts.slot_id
  AND s.account_id IS NULL
  AND slot_accounts.account_id IS NOT NULL;

UPDATE appointments a
SET account_id = s.account_id
FROM appointment_availability_slots s
WHERE s.id = a.slot_id
  AND a.account_id IS NULL
  AND s.account_id IS NOT NULL;

UPDATE appointment_reminder_jobs j
SET account_id = a.account_id
FROM appointments a
WHERE a.id = j.appointment_id
  AND j.account_id IS NULL
  AND a.account_id IS NOT NULL;

UPDATE appointment_reminder_deliveries d
SET account_id = a.account_id
FROM appointments a
WHERE a.id = d.appointment_id
  AND d.account_id IS NULL
  AND a.account_id IS NOT NULL;

DROP INDEX IF EXISTS idx_external_service_providers_name_ci;

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_service_providers_account_name_ci
  ON external_service_providers(account_id, LOWER(BTRIM(provider_name)))
  WHERE account_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_service_providers_unscoped_name_ci
  ON external_service_providers(LOWER(BTRIM(provider_name)))
  WHERE account_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_external_service_providers_account_active
  ON external_service_providers(account_id, is_active, provider_name)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_threads_account_status
  ON portal_threads(account_id, status, last_message_at DESC)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_account_start
  ON appointments(account_id, start_time ASC)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_account_status_start
  ON appointments(account_id, status, start_time ASC)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointment_slots_account_start
  ON appointment_availability_slots(account_id, status, start_time ASC)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_jobs_account_due
  ON appointment_reminder_jobs(account_id, status, scheduled_for, processing_started_at)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_deliveries_account_sent
  ON appointment_reminder_deliveries(account_id, sent_at DESC)
  WHERE account_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_portal_thread_account_id()
RETURNS TRIGGER AS $$
DECLARE
  resolved_account_id UUID;
BEGIN
  SELECT COALESCE(pu.account_id, c.account_id, ca.account_id)
  INTO resolved_account_id
  FROM portal_users pu
  LEFT JOIN contacts c ON c.id = NEW.contact_id
  LEFT JOIN cases ca ON ca.id = NEW.case_id
  WHERE pu.id = NEW.portal_user_id;

  NEW.account_id := COALESCE(NEW.account_id, resolved_account_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_portal_thread_account_id ON portal_threads;
CREATE TRIGGER set_portal_thread_account_id
  BEFORE INSERT OR UPDATE OF contact_id, case_id, portal_user_id, account_id ON portal_threads
  FOR EACH ROW EXECUTE FUNCTION sync_portal_thread_account_id();

CREATE OR REPLACE FUNCTION sync_appointment_slot_account_id()
RETURNS TRIGGER AS $$
DECLARE
  resolved_account_id UUID;
BEGIN
  SELECT c.account_id
  INTO resolved_account_id
  FROM cases c
  WHERE c.id = NEW.case_id;

  NEW.account_id := COALESCE(NEW.account_id, resolved_account_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_appointment_slot_account_id ON appointment_availability_slots;
CREATE TRIGGER set_appointment_slot_account_id
  BEFORE INSERT OR UPDATE OF case_id, account_id ON appointment_availability_slots
  FOR EACH ROW EXECUTE FUNCTION sync_appointment_slot_account_id();

CREATE OR REPLACE FUNCTION sync_appointment_account_id()
RETURNS TRIGGER AS $$
DECLARE
  resolved_account_id UUID;
BEGIN
  SELECT COALESCE(c.account_id, ca.account_id, s.account_id)
  INTO resolved_account_id
  FROM contacts c
  LEFT JOIN cases ca ON ca.id = NEW.case_id
  LEFT JOIN appointment_availability_slots s ON s.id = NEW.slot_id
  WHERE c.id = NEW.contact_id;

  NEW.account_id := COALESCE(NEW.account_id, resolved_account_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_appointment_account_id ON appointments;
CREATE TRIGGER set_appointment_account_id
  BEFORE INSERT OR UPDATE OF contact_id, case_id, slot_id, account_id ON appointments
  FOR EACH ROW EXECUTE FUNCTION sync_appointment_account_id();

CREATE OR REPLACE FUNCTION sync_appointment_reminder_job_account_id()
RETURNS TRIGGER AS $$
DECLARE
  resolved_account_id UUID;
BEGIN
  SELECT a.account_id
  INTO resolved_account_id
  FROM appointments a
  WHERE a.id = NEW.appointment_id;

  NEW.account_id := resolved_account_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_appointment_reminder_job_account_id ON appointment_reminder_jobs;
CREATE TRIGGER set_appointment_reminder_job_account_id
  BEFORE INSERT OR UPDATE OF appointment_id ON appointment_reminder_jobs
  FOR EACH ROW EXECUTE FUNCTION sync_appointment_reminder_job_account_id();

CREATE OR REPLACE FUNCTION sync_appointment_reminder_delivery_account_id()
RETURNS TRIGGER AS $$
DECLARE
  resolved_account_id UUID;
BEGIN
  SELECT a.account_id
  INTO resolved_account_id
  FROM appointments a
  WHERE a.id = NEW.appointment_id;

  NEW.account_id := resolved_account_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_appointment_reminder_delivery_account_id ON appointment_reminder_deliveries;
CREATE TRIGGER set_appointment_reminder_delivery_account_id
  BEFORE INSERT OR UPDATE OF appointment_id ON appointment_reminder_deliveries
  FOR EACH ROW EXECUTE FUNCTION sync_appointment_reminder_delivery_account_id();

COMMENT ON COLUMN external_service_providers.account_id IS
  'Tenant scope for external provider directory entries; null legacy rows are excluded from tenant-scoped provider APIs';
COMMENT ON COLUMN portal_threads.account_id IS
  'Tenant scope for portal admin conversation queries';
COMMENT ON COLUMN appointments.account_id IS
  'Tenant scope for portal admin appointment and reminder queries';
COMMENT ON COLUMN appointment_availability_slots.account_id IS
  'Tenant scope for portal admin slot queries';
COMMENT ON COLUMN appointment_reminder_jobs.account_id IS
  'Tenant scope copied from the appointment for reminder queue processing and admin queries';
COMMENT ON COLUMN appointment_reminder_deliveries.account_id IS
  'Tenant scope copied from the appointment for reminder delivery history queries';
COMMENT ON COLUMN portal_users.auth_revision IS
  'Portal session invalidation revision incremented after portal password changes';
