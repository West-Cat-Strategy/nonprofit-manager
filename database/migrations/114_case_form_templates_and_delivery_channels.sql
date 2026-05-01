-- Migration 114: Case-form templates and delivery channels
-- Created: 2026-05-01
-- Description:
--   * promotes case-form defaults into reusable contact-free template drafts
--   * adds assignment structure autosave metadata
--   * adds explicit portal/email/sms delivery channels and SMS secure-link support

ALTER TABLE case_form_defaults
  ALTER COLUMN case_type_id DROP NOT NULL;

ALTER TABLE case_form_defaults
  ADD COLUMN IF NOT EXISTS template_status VARCHAR(20) NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS last_autosaved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS saved_from_assignment_id UUID REFERENCES case_form_assignments(id) ON DELETE SET NULL;

UPDATE case_form_defaults
SET template_status = 'published'
WHERE template_status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_form_defaults_template_status_check'
  ) THEN
    ALTER TABLE case_form_defaults
      ADD CONSTRAINT case_form_defaults_template_status_check
      CHECK (template_status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_case_form_defaults_template_library
  ON case_form_defaults(account_id, template_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_defaults_saved_from_assignment
  ON case_form_defaults(saved_from_assignment_id)
  WHERE saved_from_assignment_id IS NOT NULL;

ALTER TABLE case_form_assignments
  ADD COLUMN IF NOT EXISTS delivery_channels TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_structure_autosaved_at TIMESTAMP WITH TIME ZONE;

UPDATE case_form_assignments
SET delivery_channels = CASE
  WHEN delivery_target = 'portal_and_email' THEN ARRAY['portal', 'email']::text[]
  WHEN delivery_target = 'portal' THEN ARRAY['portal']::text[]
  WHEN delivery_target = 'email' THEN ARRAY['email']::text[]
  ELSE delivery_channels
END
WHERE delivery_target IS NOT NULL
  AND (delivery_channels IS NULL OR cardinality(delivery_channels) = 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_form_assignments_delivery_channels_check'
  ) THEN
    ALTER TABLE case_form_assignments
      ADD CONSTRAINT case_form_assignments_delivery_channels_check
      CHECK (delivery_channels <@ ARRAY['portal', 'email', 'sms']::text[]);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_case_form_assignments_delivery_channels
  ON case_form_assignments USING GIN (delivery_channels);

ALTER TABLE case_form_access_tokens
  ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivery_channel VARCHAR(20);

UPDATE case_form_access_tokens
SET delivery_channel = 'email'
WHERE delivery_channel IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_form_access_tokens_delivery_channel_check'
  ) THEN
    ALTER TABLE case_form_access_tokens
      ADD CONSTRAINT case_form_access_tokens_delivery_channel_check
      CHECK (delivery_channel IS NULL OR delivery_channel IN ('email', 'sms'));
  END IF;
END $$;

ALTER TABLE case_form_assignment_events
  DROP CONSTRAINT IF EXISTS case_form_assignment_events_type_check;

ALTER TABLE case_form_assignment_events
  ADD CONSTRAINT case_form_assignment_events_type_check CHECK (
    event_type IN (
      'opened',
      'submission_recorded',
      'revision_requested',
      'reviewed',
      'closed',
      'cancelled'
    )
  );
