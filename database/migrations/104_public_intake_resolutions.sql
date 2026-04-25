-- Migration 104: Public intake resolution audit
-- Created: 2026-04-25
-- Description:
--   * records shared public-intake contact resolution decisions across website forms,
--     portal signup, and public event registration

CREATE TABLE IF NOT EXISTS public_intake_resolutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_system VARCHAR(40) NOT NULL,
  source_reference VARCHAR(255),
  collection_method VARCHAR(80),
  collection_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  matched_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ambiguity_state VARCHAR(40) NOT NULL DEFAULT 'none',
  resolution_status VARCHAR(40) NOT NULL,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT public_intake_resolutions_source_system_check CHECK (
    source_system IN ('website_form', 'portal_signup', 'public_event')
  ),
  CONSTRAINT public_intake_resolutions_ambiguity_state_check CHECK (
    ambiguity_state IN ('none', 'no_match', 'single_match', 'multiple_matches')
  ),
  CONSTRAINT public_intake_resolutions_status_check CHECK (
    resolution_status IN ('resolved', 'created', 'needs_contact_resolution', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_public_intake_resolutions_source
  ON public_intake_resolutions(source_system, source_reference, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_intake_resolutions_contact
  ON public_intake_resolutions(matched_contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_intake_resolutions_account
  ON public_intake_resolutions(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_intake_resolutions_status
  ON public_intake_resolutions(resolution_status, created_at DESC);

COMMENT ON TABLE public_intake_resolutions IS
  'Shared public intake contact resolution audit across website, portal, and events';
