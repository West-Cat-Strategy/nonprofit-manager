-- Migration: Website Builder tables
-- Description: Create tables for templates, pages, and published sites

-- ==================== Templates Table ====================

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('landing-page', 'event', 'donation', 'blog', 'multi-page', 'portfolio', 'contact')),
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_system_template BOOLEAN DEFAULT FALSE,
  theme JSONB NOT NULL DEFAULT '{}',
  global_settings JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  current_version VARCHAR(20) DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT templates_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

-- Indexes for templates
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_templates_is_system ON templates(is_system_template);
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);

COMMENT ON TABLE templates IS 'Website templates that users can customize and publish';
COMMENT ON COLUMN templates.user_id IS 'NULL for system templates, otherwise the owner user';
COMMENT ON COLUMN templates.theme IS 'JSONB containing color palette, typography, spacing settings';
COMMENT ON COLUMN templates.global_settings IS 'JSONB containing header, footer, navigation, and site-wide settings';
COMMENT ON COLUMN templates.metadata IS 'JSONB containing author, version, preview images, etc.';

-- ==================== Template Pages Table ====================

CREATE TABLE IF NOT EXISTS template_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  is_homepage BOOLEAN DEFAULT FALSE,
  seo JSONB NOT NULL DEFAULT '{}',
  sections JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT template_pages_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
  CONSTRAINT template_pages_slug_length CHECK (char_length(slug) >= 1 AND char_length(slug) <= 255),
  CONSTRAINT template_pages_unique_slug UNIQUE (template_id, slug)
);

-- Indexes for template_pages
CREATE INDEX idx_template_pages_template_id ON template_pages(template_id);
CREATE INDEX idx_template_pages_slug ON template_pages(slug);
CREATE INDEX idx_template_pages_is_homepage ON template_pages(is_homepage) WHERE is_homepage = TRUE;
CREATE INDEX idx_template_pages_sort_order ON template_pages(template_id, sort_order);

COMMENT ON TABLE template_pages IS 'Individual pages within a template';
COMMENT ON COLUMN template_pages.seo IS 'JSONB containing title, description, og tags, etc.';
COMMENT ON COLUMN template_pages.sections IS 'JSONB array of page sections with components';

-- ==================== Template Versions Table ====================

CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  changes TEXT,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT template_versions_unique UNIQUE (template_id, version)
);

-- Indexes for template_versions
CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_created_at ON template_versions(created_at DESC);

COMMENT ON TABLE template_versions IS 'Version history for templates';
COMMENT ON COLUMN template_versions.snapshot IS 'Complete template state at this version (theme, settings, pages)';

-- ==================== Published Sites Table ====================

CREATE TABLE IF NOT EXISTS published_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE,
  custom_domain VARCHAR(255) UNIQUE,
  ssl_enabled BOOLEAN DEFAULT FALSE,
  ssl_certificate_expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'maintenance', 'suspended')),
  published_version VARCHAR(20),
  published_at TIMESTAMP WITH TIME ZONE,
  published_content JSONB,
  analytics_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT published_sites_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
  CONSTRAINT published_sites_subdomain_format CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR subdomain ~ '^[a-z0-9]$')
);

-- Indexes for published_sites
CREATE INDEX idx_published_sites_user_id ON published_sites(user_id);
CREATE INDEX idx_published_sites_template_id ON published_sites(template_id);
CREATE INDEX idx_published_sites_subdomain ON published_sites(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX idx_published_sites_custom_domain ON published_sites(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_published_sites_status ON published_sites(status);

COMMENT ON TABLE published_sites IS 'Published websites created from templates';
COMMENT ON COLUMN published_sites.subdomain IS 'Subdomain for hosting (e.g., myorg.nonprofitmanager.com)';
COMMENT ON COLUMN published_sites.custom_domain IS 'Custom domain if configured (e.g., www.mynonprofit.org)';
COMMENT ON COLUMN published_sites.published_content IS 'Snapshot of content at publish time for static generation';

-- ==================== Site Analytics Table ====================

CREATE TABLE IF NOT EXISTS site_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  page_path VARCHAR(500) NOT NULL,
  visitor_id VARCHAR(100),
  session_id VARCHAR(100),
  user_agent TEXT,
  referrer TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  event_type VARCHAR(50) DEFAULT 'pageview' CHECK (event_type IN ('pageview', 'click', 'form_submit', 'donation', 'event_register')),
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for site_analytics (partitioning recommended for production)
CREATE INDEX idx_site_analytics_site_id ON site_analytics(site_id);
CREATE INDEX idx_site_analytics_page_path ON site_analytics(page_path);
CREATE INDEX idx_site_analytics_created_at ON site_analytics(created_at DESC);
CREATE INDEX idx_site_analytics_event_type ON site_analytics(event_type);
CREATE INDEX idx_site_analytics_visitor_session ON site_analytics(site_id, visitor_id, session_id);

COMMENT ON TABLE site_analytics IS 'Analytics data for published sites';
COMMENT ON COLUMN site_analytics.visitor_id IS 'Anonymous visitor identifier (cookie-based)';
COMMENT ON COLUMN site_analytics.session_id IS 'Session identifier for grouping pageviews';

-- ==================== Media Library Table ====================

CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text VARCHAR(500),
  caption TEXT,
  folder VARCHAR(255) DEFAULT '/',
  url VARCHAR(1000) NOT NULL,
  thumbnail_url VARCHAR(1000),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT media_library_filename_length CHECK (char_length(filename) >= 1 AND char_length(filename) <= 255)
);

-- Indexes for media_library
CREATE INDEX idx_media_library_user_id ON media_library(user_id);
CREATE INDEX idx_media_library_folder ON media_library(user_id, folder);
CREATE INDEX idx_media_library_mime_type ON media_library(mime_type);
CREATE INDEX idx_media_library_created_at ON media_library(created_at DESC);

COMMENT ON TABLE media_library IS 'Uploaded images and files for use in templates';
COMMENT ON COLUMN media_library.folder IS 'Virtual folder path for organization';
COMMENT ON COLUMN media_library.thumbnail_url IS 'Auto-generated thumbnail for images';

-- ==================== Functions and Triggers ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_website_builder_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_templates_timestamp
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_website_builder_timestamp();

CREATE TRIGGER update_template_pages_timestamp
  BEFORE UPDATE ON template_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_website_builder_timestamp();

CREATE TRIGGER update_published_sites_timestamp
  BEFORE UPDATE ON published_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_website_builder_timestamp();

CREATE TRIGGER update_media_library_timestamp
  BEFORE UPDATE ON media_library
  FOR EACH ROW
  EXECUTE FUNCTION update_website_builder_timestamp();

-- Function to ensure only one homepage per template
CREATE OR REPLACE FUNCTION ensure_single_homepage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_homepage = TRUE THEN
    UPDATE template_pages
    SET is_homepage = FALSE
    WHERE template_id = NEW.template_id
      AND id != NEW.id
      AND is_homepage = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_homepage_trigger
  BEFORE INSERT OR UPDATE ON template_pages
  FOR EACH ROW
  WHEN (NEW.is_homepage = TRUE)
  EXECUTE FUNCTION ensure_single_homepage();
