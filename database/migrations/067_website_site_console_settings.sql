-- Migration 067: Website site-console settings

CREATE TABLE IF NOT EXISTS website_site_settings (
  site_id UUID PRIMARY KEY REFERENCES published_sites(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  mailchimp_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  stripe_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  form_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  form_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  conversion_tracking JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_site_settings_org
  ON website_site_settings(organization_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_website_site_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_website_site_settings_updated_at
      BEFORE UPDATE ON website_site_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO website_site_settings (site_id, organization_id)
SELECT ps.id, ps.organization_id
FROM published_sites ps
LEFT JOIN website_site_settings wss ON wss.site_id = ps.id
WHERE wss.site_id IS NULL;
