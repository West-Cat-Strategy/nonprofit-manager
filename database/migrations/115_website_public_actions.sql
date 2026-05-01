-- Public website action expansion: typed action registry, provenance, pledges, and support-letter requests.

ALTER TABLE template_pages
  DROP CONSTRAINT IF EXISTS template_pages_collection_check;

ALTER TABLE template_pages
  ADD CONSTRAINT template_pages_collection_check
  CHECK (collection IS NULL OR collection IN ('events', 'newsletters', 'blog'));

ALTER TABLE website_entries
  DROP CONSTRAINT IF EXISTS website_entries_kind_check;

ALTER TABLE website_entries
  ADD CONSTRAINT website_entries_kind_check
  CHECK (kind IN ('newsletter', 'blog_post', 'campaign_update'));

CREATE TABLE IF NOT EXISTS website_public_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES template_pages(id) ON DELETE SET NULL,
  component_id VARCHAR(120),
  action_type VARCHAR(40) NOT NULL CHECK (
    action_type IN (
      'event_signup',
      'self_referral',
      'petition_signature',
      'donation_checkout',
      'donation_pledge',
      'support_letter_request',
      'newsletter_signup',
      'volunteer_interest',
      'contact'
    )
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'closed', 'archived')
  ),
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  confirmation_message TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT website_public_actions_site_slug_unique UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_website_public_actions_site_type_status
  ON website_public_actions(site_id, action_type, status);
CREATE INDEX IF NOT EXISTS idx_website_public_actions_org_status
  ON website_public_actions(organization_id, status);

CREATE TABLE IF NOT EXISTS website_public_action_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES website_public_actions(id) ON DELETE CASCADE,
  action_type VARCHAR(40) NOT NULL CHECK (
    action_type IN (
      'event_signup',
      'self_referral',
      'petition_signature',
      'donation_checkout',
      'donation_pledge',
      'support_letter_request',
      'newsletter_signup',
      'volunteer_interest',
      'contact'
    )
  ),
  review_status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (
    review_status IN ('new', 'duplicate', 'needs_review', 'accepted', 'rejected', 'fulfilled')
  ),
  idempotency_key VARCHAR(255),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  source_entity_type VARCHAR(80),
  source_entity_id UUID,
  duplicate_of_submission_id UUID REFERENCES website_public_action_submissions(id) ON DELETE SET NULL,
  consent JSONB NOT NULL DEFAULT '{}',
  payload_redacted JSONB NOT NULL DEFAULT '{}',
  generated_artifact JSONB NOT NULL DEFAULT '{}',
  page_path TEXT,
  visitor_id VARCHAR(255),
  session_id VARCHAR(255),
  referrer TEXT,
  user_agent TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_public_action_submission_idempotency
  ON website_public_action_submissions(action_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_public_action_submissions_action
  ON website_public_action_submissions(action_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_action_submissions_contact
  ON website_public_action_submissions(contact_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_action_submissions_review
  ON website_public_action_submissions(organization_id, review_status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS website_public_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES website_public_actions(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES website_public_action_submissions(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id VARCHAR(255),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'CAD',
  schedule JSONB NOT NULL DEFAULT '{}',
  due_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'promised' CHECK (
    status IN ('promised', 'reminded', 'fulfilled', 'cancelled', 'expired')
  ),
  fulfilled_donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_public_pledges_org_status
  ON website_public_pledges(organization_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_website_public_pledges_contact
  ON website_public_pledges(contact_id, created_at DESC);

CREATE TABLE IF NOT EXISTS website_support_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES website_public_actions(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES website_public_action_submissions(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  template_version VARCHAR(80) NOT NULL DEFAULT 'v1',
  letter_title VARCHAR(255) NOT NULL,
  letter_body TEXT NOT NULL,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (
    approval_status IN ('draft', 'approved', 'sent', 'rejected')
  ),
  generated_metadata JSONB NOT NULL DEFAULT '{}',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_support_letters_org_status
  ON website_support_letters(organization_id, approval_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_support_letters_contact
  ON website_support_letters(contact_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_website_public_actions_updated_at'
  ) THEN
    CREATE TRIGGER update_website_public_actions_updated_at
      BEFORE UPDATE ON website_public_actions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_website_public_action_submissions_updated_at'
  ) THEN
    CREATE TRIGGER update_website_public_action_submissions_updated_at
      BEFORE UPDATE ON website_public_action_submissions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_website_public_pledges_updated_at'
  ) THEN
    CREATE TRIGGER update_website_public_pledges_updated_at
      BEFORE UPDATE ON website_public_pledges
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_website_support_letters_updated_at'
  ) THEN
    CREATE TRIGGER update_website_support_letters_updated_at
      BEFORE UPDATE ON website_support_letters
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
