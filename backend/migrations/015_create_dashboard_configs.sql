/**
 * Migration: Create dashboard_configs table
 * Stores customizable dashboard configurations for users
 */

-- Create dashboard_configs table
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  breakpoints JSONB,
  cols JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON dashboard_configs(user_id);

-- Create unique partial index to ensure only one default dashboard per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_configs_user_default
  ON dashboard_configs(user_id)
  WHERE is_default = true;

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_created_at ON dashboard_configs(created_at DESC);

-- Add comments
COMMENT ON TABLE dashboard_configs IS 'Stores customizable dashboard configurations for users';
COMMENT ON COLUMN dashboard_configs.id IS 'Unique identifier for the dashboard configuration';
COMMENT ON COLUMN dashboard_configs.user_id IS 'Reference to the user who owns this dashboard';
COMMENT ON COLUMN dashboard_configs.name IS 'Display name for the dashboard';
COMMENT ON COLUMN dashboard_configs.is_default IS 'Whether this is the user default dashboard';
COMMENT ON COLUMN dashboard_configs.widgets IS 'JSON array of widget configurations';
COMMENT ON COLUMN dashboard_configs.layout IS 'JSON array of widget layout positions';
COMMENT ON COLUMN dashboard_configs.breakpoints IS 'Responsive breakpoints configuration';
COMMENT ON COLUMN dashboard_configs.cols IS 'Column counts for each breakpoint';
