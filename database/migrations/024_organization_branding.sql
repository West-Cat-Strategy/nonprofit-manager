-- Organization branding configuration (single-tenant)
-- Stores app name, colors, and icons configured in Admin Settings.

CREATE TABLE IF NOT EXISTS organization_branding (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO organization_branding (id, config)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

