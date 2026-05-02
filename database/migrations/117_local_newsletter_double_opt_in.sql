-- Migration 117: local newsletter double opt-in confirmations
-- Adds pending confirmation state before public newsletter signups create/update CRM contacts
-- or sync to external newsletter providers.

CREATE TABLE IF NOT EXISTS newsletter_signup_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  form_key TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT 'Website',
  last_name TEXT NOT NULL DEFAULT 'Visitor',
  provider VARCHAR(40) NOT NULL DEFAULT 'local_email',
  audience_id TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmation_email_sent_at TIMESTAMP WITH TIME ZONE,
  last_send_attempt_at TIMESTAMP WITH TIME ZONE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT newsletter_signup_confirmations_provider_check CHECK (
    provider IN ('local_email', 'mailchimp', 'mautic')
  ),
  CONSTRAINT newsletter_signup_confirmations_email_not_blank CHECK (btrim(email_normalized) <> ''),
  CONSTRAINT newsletter_signup_confirmations_form_key_not_blank CHECK (btrim(form_key) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_signup_confirmations_target
  ON newsletter_signup_confirmations(site_id, form_key, email_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_signup_confirmations_token_hash
  ON newsletter_signup_confirmations(token_hash);

CREATE INDEX IF NOT EXISTS idx_newsletter_signup_confirmations_site_status
  ON newsletter_signup_confirmations(site_id, confirmed_at, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_signup_confirmations_org_created
  ON newsletter_signup_confirmations(organization_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_newsletter_signup_confirmations_updated_at'
  ) THEN
    CREATE TRIGGER update_newsletter_signup_confirmations_updated_at
      BEFORE UPDATE ON newsletter_signup_confirmations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE newsletter_signup_confirmations IS
  'Pending and confirmed double opt-in records for public newsletter signup forms.';
COMMENT ON COLUMN newsletter_signup_confirmations.token_hash IS
  'SHA-256 hash of the public confirmation token; raw tokens are only sent by email.';
