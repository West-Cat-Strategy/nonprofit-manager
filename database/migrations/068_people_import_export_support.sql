-- Migration 068: People import/export support fields and volunteer model backfill
-- Adds the volunteer columns already expected by the application import/export flows.

ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS availability_notes TEXT,
  ADD COLUMN IF NOT EXISTS background_check_expiry DATE,
  ADD COLUMN IF NOT EXISTS preferred_roles TEXT[],
  ADD COLUMN IF NOT EXISTS certifications TEXT[],
  ADD COLUMN IF NOT EXISTS max_hours_per_week INTEGER,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
  ADD COLUMN IF NOT EXISTS volunteer_since DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS total_hours_logged NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE volunteers
SET availability_status = CASE
  WHEN volunteer_status IN ('available', 'unavailable', 'limited') THEN volunteer_status
  WHEN volunteer_status IN ('inactive', 'retired', 'on_leave') THEN 'unavailable'
  ELSE 'available'
END
WHERE availability_status IS NULL;

UPDATE volunteers
SET availability_notes = availability
WHERE availability_notes IS NULL
  AND availability IS NOT NULL;

UPDATE volunteers
SET total_hours_logged = COALESCE(hours_contributed, 0)
WHERE total_hours_logged = 0
  AND hours_contributed IS NOT NULL;

UPDATE volunteers
SET volunteer_since = COALESCE(created_at::date, CURRENT_DATE)
WHERE volunteer_since IS NULL;

UPDATE volunteers
SET is_active = CASE
  WHEN volunteer_status IN ('inactive', 'retired') THEN FALSE
  ELSE TRUE
END
WHERE is_active IS DISTINCT FROM CASE
  WHEN volunteer_status IN ('inactive', 'retired') THEN FALSE
  ELSE TRUE
END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_volunteers_contact_id'
  ) THEN
    ALTER TABLE volunteers
      ADD CONSTRAINT uq_volunteers_contact_id UNIQUE (contact_id);
  END IF;
END $$;

