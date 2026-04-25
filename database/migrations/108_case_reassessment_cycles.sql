-- Migration 108: Case reassessment cadence
-- Created: 2026-04-25
-- Description:
--   * adds case-linked reassessment cycles with one-time follow-up scheduling

CREATE TABLE IF NOT EXISTS case_reassessment_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  follow_up_id UUID NOT NULL UNIQUE REFERENCES follow_ups(id) ON DELETE RESTRICT,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  earliest_review_date DATE,
  due_date DATE NOT NULL,
  latest_review_date DATE,
  completion_summary TEXT,
  cancellation_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT case_reassessment_cycles_status_check CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'cancelled')
  ),
  CONSTRAINT case_reassessment_cycles_review_window_check CHECK (
    (earliest_review_date IS NULL OR earliest_review_date <= due_date)
    AND (latest_review_date IS NULL OR due_date <= latest_review_date)
  )
);

CREATE INDEX IF NOT EXISTS idx_case_reassessment_cycles_case_status_due
  ON case_reassessment_cycles(case_id, status, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_case_reassessment_cycles_owner_status_due
  ON case_reassessment_cycles(owner_user_id, status, due_date ASC)
  WHERE owner_user_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_case_reassessment_cycles_updated_at'
  ) THEN
    CREATE TRIGGER update_case_reassessment_cycles_updated_at
      BEFORE UPDATE ON case_reassessment_cycles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE case_reassessment_cycles IS
  'Case-linked reassessment cadence records backed by one-time follow-up reminders';
