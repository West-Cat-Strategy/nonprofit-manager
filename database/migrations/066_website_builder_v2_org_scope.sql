-- Migration 066: Website Builder v2 org scope, page metadata, and website entries

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migration_status VARCHAR(30) NOT NULL DEFAULT 'complete';

ALTER TABLE published_sites
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_kind VARCHAR(20) NOT NULL DEFAULT 'organization',
  ADD COLUMN IF NOT EXISTS parent_site_id UUID REFERENCES published_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migration_status VARCHAR(30) NOT NULL DEFAULT 'complete';

ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migration_status VARCHAR(30) NOT NULL DEFAULT 'complete';

ALTER TABLE template_pages
  ADD COLUMN IF NOT EXISTS page_type VARCHAR(30) NOT NULL DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS collection VARCHAR(30),
  ADD COLUMN IF NOT EXISTS route_pattern VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'templates_migration_status_check'
  ) THEN
    ALTER TABLE templates
      ADD CONSTRAINT templates_migration_status_check
      CHECK (migration_status IN ('complete', 'needs_assignment'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'published_sites_site_kind_check'
  ) THEN
    ALTER TABLE published_sites
      ADD CONSTRAINT published_sites_site_kind_check
      CHECK (site_kind IN ('organization', 'campaign'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'published_sites_migration_status_check'
  ) THEN
    ALTER TABLE published_sites
      ADD CONSTRAINT published_sites_migration_status_check
      CHECK (migration_status IN ('complete', 'needs_assignment'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_library_migration_status_check'
  ) THEN
    ALTER TABLE media_library
      ADD CONSTRAINT media_library_migration_status_check
      CHECK (migration_status IN ('complete', 'needs_assignment'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'template_pages_page_type_check'
  ) THEN
    ALTER TABLE template_pages
      ADD CONSTRAINT template_pages_page_type_check
      CHECK (page_type IN ('static', 'collectionIndex', 'collectionDetail'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'template_pages_collection_check'
  ) THEN
    ALTER TABLE template_pages
      ADD CONSTRAINT template_pages_collection_check
      CHECK (collection IS NULL OR collection IN ('events', 'newsletters'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_owner_user_id ON templates(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_templates_migration_status ON templates(migration_status);

CREATE INDEX IF NOT EXISTS idx_published_sites_organization_id ON published_sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_published_sites_owner_user_id ON published_sites(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_published_sites_site_kind ON published_sites(site_kind);
CREATE INDEX IF NOT EXISTS idx_published_sites_parent_site_id ON published_sites(parent_site_id);
CREATE INDEX IF NOT EXISTS idx_published_sites_migration_status ON published_sites(migration_status);

CREATE INDEX IF NOT EXISTS idx_media_library_organization_id ON media_library(organization_id);
CREATE INDEX IF NOT EXISTS idx_media_library_owner_user_id ON media_library(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_media_library_migration_status ON media_library(migration_status);

CREATE INDEX IF NOT EXISTS idx_template_pages_page_type ON template_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_template_pages_collection ON template_pages(collection);
CREATE INDEX IF NOT EXISTS idx_template_pages_route_pattern ON template_pages(route_pattern);

UPDATE templates
SET owner_user_id = COALESCE(owner_user_id, user_id)
WHERE owner_user_id IS NULL;

UPDATE published_sites
SET owner_user_id = COALESCE(owner_user_id, user_id)
WHERE owner_user_id IS NULL;

UPDATE media_library
SET owner_user_id = COALESCE(owner_user_id, user_id)
WHERE owner_user_id IS NULL;

WITH template_org_resolution AS (
  SELECT
    t.id AS record_id,
    (ARRAY_AGG(DISTINCT uaa.account_id))[1] AS account_id
  FROM templates t
  JOIN user_account_access uaa
    ON uaa.user_id = COALESCE(t.owner_user_id, t.user_id)
   AND uaa.is_active = TRUE
  WHERE t.organization_id IS NULL
    AND t.is_system_template = FALSE
  GROUP BY t.id
  HAVING COUNT(DISTINCT uaa.account_id) = 1
)
UPDATE templates t
SET organization_id = resolved.account_id,
    migration_status = 'complete'
FROM template_org_resolution resolved
WHERE t.id = resolved.record_id
  AND t.organization_id IS NULL;

WITH site_org_resolution AS (
  SELECT
    ps.id AS record_id,
    (ARRAY_AGG(DISTINCT uaa.account_id))[1] AS account_id
  FROM published_sites ps
  JOIN user_account_access uaa
    ON uaa.user_id = COALESCE(ps.owner_user_id, ps.user_id)
   AND uaa.is_active = TRUE
  WHERE ps.organization_id IS NULL
  GROUP BY ps.id
  HAVING COUNT(DISTINCT uaa.account_id) = 1
)
UPDATE published_sites ps
SET organization_id = resolved.account_id,
    migration_status = 'complete'
FROM site_org_resolution resolved
WHERE ps.id = resolved.record_id
  AND ps.organization_id IS NULL;

WITH media_org_resolution AS (
  SELECT
    ml.id AS record_id,
    (ARRAY_AGG(DISTINCT uaa.account_id))[1] AS account_id
  FROM media_library ml
  JOIN user_account_access uaa
    ON uaa.user_id = COALESCE(ml.owner_user_id, ml.user_id)
   AND uaa.is_active = TRUE
  WHERE ml.organization_id IS NULL
  GROUP BY ml.id
  HAVING COUNT(DISTINCT uaa.account_id) = 1
)
UPDATE media_library ml
SET organization_id = resolved.account_id,
    migration_status = 'complete'
FROM media_org_resolution resolved
WHERE ml.id = resolved.record_id
  AND ml.organization_id IS NULL;

UPDATE templates
SET migration_status = CASE
  WHEN is_system_template = TRUE THEN 'complete'
  WHEN organization_id IS NULL THEN 'needs_assignment'
  ELSE 'complete'
END;

UPDATE published_sites
SET migration_status = CASE
  WHEN organization_id IS NULL THEN 'needs_assignment'
  ELSE 'complete'
END;

UPDATE media_library
SET migration_status = CASE
  WHEN organization_id IS NULL THEN 'needs_assignment'
  ELSE 'complete'
END;

UPDATE template_pages
SET route_pattern = CASE
  WHEN is_homepage = TRUE THEN '/'
  ELSE '/' || slug
END
WHERE route_pattern IS NULL;

CREATE TABLE IF NOT EXISTS website_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  kind VARCHAR(30) NOT NULL CHECK (kind IN ('newsletter')),
  source VARCHAR(30) NOT NULL DEFAULT 'native' CHECK (source IN ('native', 'mailchimp')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT,
  body TEXT,
  body_html TEXT,
  seo JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  external_source_id VARCHAR(255),
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT website_entries_site_slug_unique UNIQUE (site_id, kind, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_entries_external_source
  ON website_entries(site_id, source, external_source_id)
  WHERE external_source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_website_entries_site_kind_status
  ON website_entries(site_id, kind, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_entries_org
  ON website_entries(organization_id, kind, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_website_entries_updated_at'
  ) THEN
    CREATE TRIGGER update_website_entries_updated_at
      BEFORE UPDATE ON website_entries
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
