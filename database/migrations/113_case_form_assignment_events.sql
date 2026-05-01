-- Migration 113: Case-form assignment evidence events
-- Created: 2026-05-01
-- Description:
--   * adds append-only evidence events for staff case-form assignment review
--   * records submission and review decisions without copying answer or file payloads

CREATE TABLE IF NOT EXISTS case_form_assignment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES case_form_assignments(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES case_form_submissions(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,
  actor_type VARCHAR(20) NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_portal_user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  access_token_id UUID REFERENCES case_form_access_tokens(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT case_form_assignment_events_type_check CHECK (
    event_type IN (
      'submission_recorded',
      'revision_requested',
      'reviewed',
      'closed',
      'cancelled'
    )
  ),
  CONSTRAINT case_form_assignment_events_actor_check CHECK (
    actor_type IN ('staff', 'portal', 'public', 'system')
  )
);

CREATE INDEX IF NOT EXISTS idx_case_form_assignment_events_assignment
  ON case_form_assignment_events(assignment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_assignment_events_case
  ON case_form_assignment_events(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_assignment_events_submission
  ON case_form_assignment_events(submission_id, created_at DESC)
  WHERE submission_id IS NOT NULL;

COMMENT ON TABLE case_form_assignment_events IS
  'Append-only staff evidence trail for case-form assignment submissions and review decisions';

COMMENT ON COLUMN case_form_assignment_events.metadata IS
  'Evidence metadata should store IDs, counts, and decision labels only; do not copy form answers or file contents';
