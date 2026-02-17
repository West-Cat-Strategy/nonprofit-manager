-- Migration: Create dashboard_configs table (docker init / manual)

CREATE TABLE IF NOT EXISTS dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  breakpoints JSONB NOT NULL DEFAULT '{}'::jsonb,
  cols JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON dashboard_configs(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_configs_user_default
  ON dashboard_configs(user_id)
  WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_created_at ON dashboard_configs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_default ON dashboard_configs(user_id, is_default);

COMMENT ON TABLE dashboard_configs IS 'Stores customizable dashboard configurations for users';
COMMENT ON COLUMN dashboard_configs.id IS 'Unique identifier for the dashboard configuration';
COMMENT ON COLUMN dashboard_configs.user_id IS 'Reference to the user who owns this dashboard';
COMMENT ON COLUMN dashboard_configs.name IS 'Display name for the dashboard';
COMMENT ON COLUMN dashboard_configs.is_default IS 'Whether this is the user default dashboard';
COMMENT ON COLUMN dashboard_configs.widgets IS 'JSON array of widget configurations';
COMMENT ON COLUMN dashboard_configs.layout IS 'JSON array of widget layout positions';
COMMENT ON COLUMN dashboard_configs.breakpoints IS 'Responsive breakpoints configuration';
COMMENT ON COLUMN dashboard_configs.cols IS 'Column counts for each breakpoint';
