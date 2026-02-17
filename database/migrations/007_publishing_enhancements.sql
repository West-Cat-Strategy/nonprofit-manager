-- Migration: Publishing Enhancements
-- Description: Add site version history and domain configuration

-- ==================== Site Versions Table ====================
-- Stores version history for published sites to enable rollback

CREATE TABLE IF NOT EXISTS site_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  published_content JSONB NOT NULL,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_description TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT site_versions_unique UNIQUE (site_id, version)
);

-- Indexes for site_versions
CREATE INDEX idx_site_versions_site_id ON site_versions(site_id);
CREATE INDEX idx_site_versions_published_at ON site_versions(published_at DESC);
CREATE INDEX idx_site_versions_published_by ON site_versions(published_by);

COMMENT ON TABLE site_versions IS 'Version history for published sites to support rollback';
COMMENT ON COLUMN site_versions.version IS 'Version identifier (e.g., v1706123456789)';
COMMENT ON COLUMN site_versions.published_content IS 'Complete content snapshot at this version';
COMMENT ON COLUMN site_versions.change_description IS 'Description of changes in this version';

-- ==================== Add Domain Configuration Column ====================
-- Stores custom domain verification and DNS configuration

ALTER TABLE published_sites
ADD COLUMN IF NOT EXISTS domain_config JSONB;

COMMENT ON COLUMN published_sites.domain_config IS 'JSONB storing domain verification status, DNS records, and SSL config';

-- ==================== Create Index for Domain Config ====================
CREATE INDEX IF NOT EXISTS idx_published_sites_domain_config
ON published_sites USING GIN(domain_config)
WHERE domain_config IS NOT NULL;

-- ==================== Function to Limit Version History ====================
-- Automatically prune old versions when exceeding max count

CREATE OR REPLACE FUNCTION prune_site_versions()
RETURNS TRIGGER AS $$
DECLARE
  max_versions INTEGER := 50;
  version_count INTEGER;
BEGIN
  -- Count current versions for this site
  SELECT COUNT(*) INTO version_count
  FROM site_versions
  WHERE site_id = NEW.site_id;

  -- If over limit, delete oldest versions
  IF version_count > max_versions THEN
    DELETE FROM site_versions
    WHERE id IN (
      SELECT id FROM site_versions
      WHERE site_id = NEW.site_id
      ORDER BY published_at ASC
      LIMIT (version_count - max_versions)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prune_site_versions_trigger
  AFTER INSERT ON site_versions
  FOR EACH ROW
  EXECUTE FUNCTION prune_site_versions();

-- ==================== View for Recent Site Activity ====================
-- Combines version history with site info for dashboard

CREATE OR REPLACE VIEW site_activity_summary AS
SELECT
  ps.id AS site_id,
  ps.name AS site_name,
  ps.subdomain,
  ps.custom_domain,
  ps.status,
  ps.ssl_enabled,
  ps.published_version AS current_version,
  ps.published_at AS last_published,
  (SELECT COUNT(*) FROM site_versions sv WHERE sv.site_id = ps.id) AS version_count,
  (SELECT sv.published_at
   FROM site_versions sv
   WHERE sv.site_id = ps.id
   ORDER BY sv.published_at DESC
   LIMIT 1 OFFSET 1) AS previous_publish_date,
  CASE
    WHEN ps.domain_config IS NOT NULL
    THEN (ps.domain_config->>'verificationStatus')::TEXT
    ELSE NULL
  END AS domain_status,
  ps.user_id
FROM published_sites ps;

COMMENT ON VIEW site_activity_summary IS 'Summary view of site publishing activity';
