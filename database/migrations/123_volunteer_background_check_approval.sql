-- Migration 123: Volunteer background-check approval metadata
-- Adds audited metadata for the dedicated background-check approval transition.

ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS background_check_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS background_check_approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS background_check_approval_notes TEXT;

COMMENT ON COLUMN volunteers.background_check_approved_by IS
  'User who approved the latest volunteer background check through the dedicated approval endpoint.';
COMMENT ON COLUMN volunteers.background_check_approved_at IS
  'Timestamp when the latest volunteer background check was approved through the dedicated approval endpoint.';
COMMENT ON COLUMN volunteers.background_check_approval_notes IS
  'Reviewer notes captured with the latest volunteer background-check approval.';
