-- Migration 080: social media tracking module (Facebook-first)

CREATE TABLE IF NOT EXISTS social_media_org_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  platform VARCHAR(32) NOT NULL,
  app_id VARCHAR(255),
  app_secret_encrypted TEXT,
  access_token_encrypted TEXT,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  last_test_success BOOLEAN,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_error TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT social_media_org_settings_platform_check CHECK (platform IN ('facebook')),
  CONSTRAINT social_media_org_settings_unique UNIQUE (organization_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_media_org_settings_org_platform
  ON social_media_org_settings(organization_id, platform);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_social_media_org_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_social_media_org_settings_updated_at
      BEFORE UPDATE ON social_media_org_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS social_media_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  settings_id UUID NOT NULL REFERENCES social_media_org_settings(id) ON DELETE CASCADE,
  platform VARCHAR(32) NOT NULL,
  external_page_id VARCHAR(255) NOT NULL,
  page_name VARCHAR(255) NOT NULL,
  page_access_token_encrypted TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_error TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT social_media_pages_platform_check CHECK (platform IN ('facebook')),
  CONSTRAINT social_media_pages_unique UNIQUE (organization_id, platform, external_page_id)
);

CREATE INDEX IF NOT EXISTS idx_social_media_pages_org_platform
  ON social_media_pages(organization_id, platform, page_name);

CREATE INDEX IF NOT EXISTS idx_social_media_pages_due_sync
  ON social_media_pages(platform, sync_enabled, last_sync_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_social_media_pages_updated_at'
  ) THEN
    CREATE TRIGGER update_social_media_pages_updated_at
      BEFORE UPDATE ON social_media_pages
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS social_media_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES social_media_pages(id) ON DELETE CASCADE,
  platform VARCHAR(32) NOT NULL,
  snapshot_date DATE NOT NULL,
  followers BIGINT,
  reach BIGINT,
  impressions BIGINT,
  engaged_users BIGINT,
  post_count BIGINT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT social_media_daily_snapshots_platform_check CHECK (platform IN ('facebook')),
  CONSTRAINT social_media_daily_snapshots_unique UNIQUE (page_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_social_media_daily_snapshots_page_date
  ON social_media_daily_snapshots(page_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_social_media_daily_snapshots_org_platform_date
  ON social_media_daily_snapshots(organization_id, platform, snapshot_date DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_social_media_daily_snapshots_updated_at'
  ) THEN
    CREATE TRIGGER update_social_media_daily_snapshots_updated_at
      BEFORE UPDATE ON social_media_daily_snapshots
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE website_site_settings
  ADD COLUMN IF NOT EXISTS social_config JSONB NOT NULL DEFAULT '{}'::jsonb;
