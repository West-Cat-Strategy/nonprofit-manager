-- Migration 109: Case closure checklists
-- Created: 2026-04-26
-- Description:
--   * adds case-scoped closure continuity checklists for structured case closure records

CREATE TABLE IF NOT EXISTS case_closure_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES case_statuses(id) ON DELETE RESTRICT,
  final_summary TEXT NOT NULL,
  open_follow_ups_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  portal_visibility_governance JSONB NOT NULL DEFAULT '{}'::jsonb,
  reassignment_referral_notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_closure_checklists_case_id
  ON case_closure_checklists(case_id);

CREATE INDEX IF NOT EXISTS idx_case_closure_checklists_org_id
  ON case_closure_checklists(organization_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_case_closure_checklists_updated_at'
  ) THEN
    CREATE TRIGGER update_case_closure_checklists_updated_at
      BEFORE UPDATE ON case_closure_checklists
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE case_closure_checklists IS
  'Structured closure records for cases, capturing final summary, portal visibility, and transition notes.';
