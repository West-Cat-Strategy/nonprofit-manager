/**
 * Migration: Create alerts tables
 * Stores alert configurations and triggered alert instances
 */

-- Create alert_configs table
CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric_type VARCHAR(50) NOT NULL,
  condition VARCHAR(50) NOT NULL,
  threshold NUMERIC,
  percentage_change NUMERIC,
  sensitivity NUMERIC DEFAULT 2.0,
  frequency VARCHAR(20) NOT NULL,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  enabled BOOLEAN DEFAULT true,
  recipients JSONB,
  filters JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_triggered TIMESTAMP
);

-- Create alert_instances table
CREATE TABLE IF NOT EXISTS alert_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
  alert_name VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  condition VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'triggered',
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  current_value NUMERIC NOT NULL,
  threshold_value NUMERIC,
  message TEXT NOT NULL,
  details JSONB,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP
);

-- Create indexes for alert_configs
CREATE INDEX IF NOT EXISTS idx_alert_configs_user_id ON alert_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_enabled ON alert_configs(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_alert_configs_metric_type ON alert_configs(metric_type);
CREATE INDEX IF NOT EXISTS idx_alert_configs_severity ON alert_configs(severity);

-- Create indexes for alert_instances
CREATE INDEX IF NOT EXISTS idx_alert_instances_config_id ON alert_instances(alert_config_id);
CREATE INDEX IF NOT EXISTS idx_alert_instances_status ON alert_instances(status);
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered_at ON alert_instances(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_instances_severity ON alert_instances(severity);

-- Add comments for alert_configs
COMMENT ON TABLE alert_configs IS 'Stores alert configuration rules for analytics monitoring';
COMMENT ON COLUMN alert_configs.id IS 'Unique identifier for the alert configuration';
COMMENT ON COLUMN alert_configs.user_id IS 'User who owns this alert configuration';
COMMENT ON COLUMN alert_configs.name IS 'Display name for the alert';
COMMENT ON COLUMN alert_configs.metric_type IS 'Type of metric being monitored';
COMMENT ON COLUMN alert_configs.condition IS 'Condition that triggers the alert';
COMMENT ON COLUMN alert_configs.threshold IS 'Threshold value for exceeds/drops_below conditions';
COMMENT ON COLUMN alert_configs.percentage_change IS 'Percentage change threshold for changes_by condition';
COMMENT ON COLUMN alert_configs.sensitivity IS 'Sensitivity for anomaly detection (1.0-4.0)';
COMMENT ON COLUMN alert_configs.frequency IS 'How often to check and notify';
COMMENT ON COLUMN alert_configs.channels IS 'Array of notification channels';
COMMENT ON COLUMN alert_configs.severity IS 'Severity level of the alert';
COMMENT ON COLUMN alert_configs.enabled IS 'Whether the alert is currently active';
COMMENT ON COLUMN alert_configs.recipients IS 'Array of email addresses or user IDs to notify';
COMMENT ON COLUMN alert_configs.filters IS 'Additional filters for the metric query';

-- Add comments for alert_instances
COMMENT ON TABLE alert_instances IS 'Stores instances when alerts are triggered';
COMMENT ON COLUMN alert_instances.id IS 'Unique identifier for the alert instance';
COMMENT ON COLUMN alert_instances.alert_config_id IS 'Reference to the alert configuration that triggered';
COMMENT ON COLUMN alert_instances.status IS 'Current status of the alert instance';
COMMENT ON COLUMN alert_instances.triggered_at IS 'When the alert was triggered';
COMMENT ON COLUMN alert_instances.resolved_at IS 'When the alert was resolved';
COMMENT ON COLUMN alert_instances.current_value IS 'Value of the metric when alert triggered';
COMMENT ON COLUMN alert_instances.threshold_value IS 'Threshold value at time of trigger';
COMMENT ON COLUMN alert_instances.message IS 'Human-readable alert message';
COMMENT ON COLUMN alert_instances.details IS 'Additional details about the alert';
COMMENT ON COLUMN alert_instances.acknowledged_by IS 'User who acknowledged the alert';
COMMENT ON COLUMN alert_instances.acknowledged_at IS 'When the alert was acknowledged';
