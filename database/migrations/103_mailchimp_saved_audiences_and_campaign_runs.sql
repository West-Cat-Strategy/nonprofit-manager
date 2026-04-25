-- Migration 103: Mailchimp saved audiences and campaign runs
-- Created: 2026-04-25
-- Description:
--   * adds internal saved audiences for reusable People-to-Mailchimp targeting
--   * adds local campaign run history and audience/suppression snapshots

CREATE TABLE IF NOT EXISTS saved_audiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_count INTEGER NOT NULL DEFAULT 0,
  scope_account_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT saved_audiences_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT saved_audiences_source_count_check CHECK (source_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_saved_audiences_status_updated
  ON saved_audiences(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_audiences_created_by
  ON saved_audiences(created_by, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_audiences_scope_accounts
  ON saved_audiences USING GIN(scope_account_ids);

CREATE TABLE IF NOT EXISTS campaign_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(40) NOT NULL DEFAULT 'mailchimp',
  provider_campaign_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  list_id VARCHAR(255) NOT NULL,
  include_audience_id UUID REFERENCES saved_audiences(id) ON DELETE SET NULL,
  exclusion_audience_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  suppression_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_recipients TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  audience_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_send_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  scope_account_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  failure_message TEXT,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT campaign_runs_provider_check CHECK (provider IN ('mailchimp')),
  CONSTRAINT campaign_runs_status_check CHECK (
    status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'canceled')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_runs_provider_campaign_id
  ON campaign_runs(provider, provider_campaign_id)
  WHERE provider_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_runs_status_updated
  ON campaign_runs(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_runs_requested_by
  ON campaign_runs(requested_by, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_runs_include_audience
  ON campaign_runs(include_audience_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_runs_scope_accounts
  ON campaign_runs USING GIN(scope_account_ids);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_saved_audiences_updated_at'
  ) THEN
    CREATE TRIGGER update_saved_audiences_updated_at
      BEFORE UPDATE ON saved_audiences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaign_runs_updated_at'
  ) THEN
    CREATE TRIGGER update_campaign_runs_updated_at
      BEFORE UPDATE ON campaign_runs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE saved_audiences IS
  'Internal saved People filter snapshots for reusable newsletter targeting';
COMMENT ON TABLE campaign_runs IS
  'Local Mailchimp campaign lifecycle history with audience and suppression snapshots';
