-- Case-form explicit delivery targets and linked review follow-ups

ALTER TABLE case_form_assignments
  ADD COLUMN IF NOT EXISTS delivery_target VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_form_assignments_delivery_target_check'
  ) THEN
    ALTER TABLE case_form_assignments
      ADD CONSTRAINT case_form_assignments_delivery_target_check
      CHECK (
        delivery_target IS NULL
        OR delivery_target IN ('portal', 'email', 'portal_and_email')
      );
  END IF;
END $$;

ALTER TABLE case_form_assignments
  ADD COLUMN IF NOT EXISTS review_follow_up_id UUID REFERENCES follow_ups(id) ON DELETE SET NULL;

UPDATE case_form_assignments cfa
SET delivery_target = 'email'
WHERE cfa.delivery_target IS NULL
  AND (
    cfa.sent_at IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM case_form_access_tokens cfat
      WHERE cfat.assignment_id = cfa.id
    )
  );

CREATE INDEX IF NOT EXISTS idx_case_form_assignments_delivery_target
  ON case_form_assignments(delivery_target, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_assignments_review_follow_up
  ON case_form_assignments(review_follow_up_id)
  WHERE review_follow_up_id IS NOT NULL;
