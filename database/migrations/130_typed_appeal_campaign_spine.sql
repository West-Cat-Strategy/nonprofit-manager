-- Migration 130: typed appeal and campaign spine
-- Adds a local campaign/appeal record and nullable links from existing
-- communications, giving, public-action, and reporting seams while preserving
-- legacy free-text and provider-id compatibility fields.

CREATE TABLE IF NOT EXISTS appeal_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  kind VARCHAR(40) NOT NULL DEFAULT 'appeal',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  compatibility_labels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT appeal_campaigns_kind_check CHECK (kind IN ('appeal', 'campaign')),
  CONSTRAINT appeal_campaigns_status_check CHECK (
    status IN ('draft', 'active', 'completed', 'archived')
  ),
  CONSTRAINT appeal_campaigns_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT appeal_campaigns_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT appeal_campaigns_date_window_check CHECK (
    start_date IS NULL OR end_date IS NULL OR start_date <= end_date
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_appeal_campaigns_org_code_lower
  ON appeal_campaigns(organization_id, lower(code));

CREATE INDEX IF NOT EXISTS idx_appeal_campaigns_org_status
  ON appeal_campaigns(organization_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_appeal_campaigns_compatibility_labels
  ON appeal_campaigns USING GIN(compatibility_labels);

CREATE TABLE IF NOT EXISTS appeal_campaign_provider_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appeal_campaign_id UUID NOT NULL REFERENCES appeal_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL,
  provider_campaign_id VARCHAR(255),
  provider_audience_id VARCHAR(255),
  label VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT appeal_campaign_provider_links_provider_check CHECK (
    provider IN ('local_email', 'mailchimp', 'mautic')
  ),
  CONSTRAINT appeal_campaign_provider_links_target_check CHECK (
    provider_campaign_id IS NOT NULL
    OR provider_audience_id IS NOT NULL
    OR label IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_appeal_campaign_provider_campaign
  ON appeal_campaign_provider_links(organization_id, provider, provider_campaign_id)
  WHERE provider_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appeal_campaign_provider_campaign_id
  ON appeal_campaign_provider_links(provider, provider_campaign_id)
  WHERE provider_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appeal_campaign_provider_audience_id
  ON appeal_campaign_provider_links(provider, provider_audience_id)
  WHERE provider_audience_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appeal_campaign_provider_links_campaign
  ON appeal_campaign_provider_links(appeal_campaign_id, provider);

ALTER TABLE campaign_runs
  ADD COLUMN IF NOT EXISTS appeal_campaign_id UUID REFERENCES appeal_campaigns(id) ON DELETE SET NULL;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS appeal_campaign_id UUID REFERENCES appeal_campaigns(id) ON DELETE SET NULL;

ALTER TABLE recurring_donation_plans
  ADD COLUMN IF NOT EXISTS appeal_campaign_id UUID REFERENCES appeal_campaigns(id) ON DELETE SET NULL;

ALTER TABLE website_entries
  ADD COLUMN IF NOT EXISTS appeal_campaign_id UUID REFERENCES appeal_campaigns(id) ON DELETE SET NULL;

ALTER TABLE website_public_actions
  ADD COLUMN IF NOT EXISTS appeal_campaign_id UUID REFERENCES appeal_campaigns(id) ON DELETE SET NULL;

ALTER TABLE website_public_pledges
  ADD COLUMN IF NOT EXISTS appeal_campaign_id UUID REFERENCES appeal_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_runs_appeal_campaign_id
  ON campaign_runs(appeal_campaign_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_donations_appeal_campaign_id
  ON donations(appeal_campaign_id, donation_date DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_donation_plans_appeal_campaign_id
  ON recurring_donation_plans(appeal_campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_website_entries_appeal_campaign_id
  ON website_entries(appeal_campaign_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_website_public_actions_appeal_campaign_id
  ON website_public_actions(appeal_campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_website_public_pledges_appeal_campaign_id
  ON website_public_pledges(appeal_campaign_id, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_appeal_campaigns_updated_at'
  ) THEN
    CREATE TRIGGER update_appeal_campaigns_updated_at
      BEFORE UPDATE ON appeal_campaigns
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_appeal_campaign_provider_links_updated_at'
  ) THEN
    CREATE TRIGGER update_appeal_campaign_provider_links_updated_at
      BEFORE UPDATE ON appeal_campaign_provider_links
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE appeal_campaigns IS
  'Organization-scoped typed appeal/campaign spine for communications, public actions, giving, and reports';
COMMENT ON TABLE appeal_campaign_provider_links IS
  'Optional provider-id compatibility links between local appeal/campaign records and Mailchimp, Mautic, or local email provider records';
COMMENT ON COLUMN donations.campaign_name IS
  'Legacy free-text campaign label retained as a compatibility input alongside appeal_campaign_id';
COMMENT ON COLUMN recurring_donation_plans.campaign_name IS
  'Legacy free-text campaign label retained as a compatibility input alongside appeal_campaign_id';
COMMENT ON COLUMN campaign_runs.provider_campaign_id IS
  'Provider-native campaign id retained as a compatibility path alongside appeal_campaign_id';
