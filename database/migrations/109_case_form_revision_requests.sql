-- Case-form revision requests stay local to assignment review.

ALTER TABLE case_form_assignments
  ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revision_notes TEXT;

ALTER TABLE case_form_assignments
  DROP CONSTRAINT IF EXISTS case_form_assignments_status_check;

ALTER TABLE case_form_assignments
  ADD CONSTRAINT case_form_assignments_status_check CHECK (
    status IN (
      'draft',
      'sent',
      'viewed',
      'in_progress',
      'submitted',
      'revision_requested',
      'reviewed',
      'closed',
      'expired',
      'cancelled'
    )
  );

CREATE INDEX IF NOT EXISTS idx_case_form_assignments_revision_requested
  ON case_form_assignments(account_id, revision_requested_at DESC)
  WHERE status = 'revision_requested';
