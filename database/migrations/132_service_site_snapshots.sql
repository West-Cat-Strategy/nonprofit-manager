-- Migration 132: service-site snapshots
-- Adds optional typed service-site snapshots to existing service and appointment
-- records. These snapshots are descriptive only; provider and location text
-- fields remain the fallback contract and no routing or referral transfer flow
-- is created here.

ALTER TABLE case_services
  ADD COLUMN IF NOT EXISTS service_site_snapshot JSONB;

ALTER TABLE appointment_availability_slots
  ADD COLUMN IF NOT EXISTS service_site_snapshot JSONB;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS service_site_snapshot JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'case_services_service_site_snapshot_object_check'
  ) THEN
    ALTER TABLE case_services
      ADD CONSTRAINT case_services_service_site_snapshot_object_check
      CHECK (service_site_snapshot IS NULL OR jsonb_typeof(service_site_snapshot) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_slots_service_site_snapshot_object_check'
  ) THEN
    ALTER TABLE appointment_availability_slots
      ADD CONSTRAINT appointment_slots_service_site_snapshot_object_check
      CHECK (service_site_snapshot IS NULL OR jsonb_typeof(service_site_snapshot) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_service_site_snapshot_object_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_service_site_snapshot_object_check
      CHECK (service_site_snapshot IS NULL OR jsonb_typeof(service_site_snapshot) = 'object');
  END IF;
END $$;

COMMENT ON COLUMN case_services.service_site_snapshot IS
  'Optional typed service-site snapshot for case services; service_provider remains the free-text fallback.';
COMMENT ON COLUMN appointment_availability_slots.service_site_snapshot IS
  'Optional typed service-site snapshot for appointment slots; location remains the free-text fallback.';
COMMENT ON COLUMN appointments.service_site_snapshot IS
  'Optional typed service-site snapshot copied to or resolved for appointments; location remains the free-text fallback.';
