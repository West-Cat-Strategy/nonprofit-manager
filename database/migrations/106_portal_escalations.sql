-- Migration 106: Case-scoped portal escalations
-- Created: 2026-04-25
-- Description:
--   * adds the first typed portal review request model linked back to cases

CREATE TABLE IF NOT EXISTS portal_escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  portal_user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  created_by_portal_user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'case_review',
  reason TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'normal',
  sensitivity VARCHAR(20) NOT NULL DEFAULT 'standard',
  assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sla_due_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  resolution_summary TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT portal_escalations_severity_check CHECK (
    severity IN ('low', 'normal', 'high', 'urgent')
  ),
  CONSTRAINT portal_escalations_sensitivity_check CHECK (
    sensitivity IN ('standard', 'sensitive')
  ),
  CONSTRAINT portal_escalations_status_check CHECK (
    status IN ('open', 'in_review', 'resolved', 'referred')
  )
);

CREATE INDEX IF NOT EXISTS idx_portal_escalations_case
  ON portal_escalations(case_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_escalations_account
  ON portal_escalations(account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_escalations_portal_user
  ON portal_escalations(portal_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_escalations_assignee
  ON portal_escalations(assignee_user_id, status, sla_due_at ASC NULLS LAST);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_portal_escalations_updated_at'
  ) THEN
    CREATE TRIGGER update_portal_escalations_updated_at
      BEFORE UPDATE ON portal_escalations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE portal_escalations IS
  'Case-scoped portal review requests with triage, SLA, sensitivity, and resolution state';
