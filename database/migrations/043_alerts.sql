-- Create alerts tables for analytics monitoring workflows

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

CREATE INDEX IF NOT EXISTS idx_alert_configs_user_id ON alert_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_enabled ON alert_configs(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_alert_configs_metric_type ON alert_configs(metric_type);
CREATE INDEX IF NOT EXISTS idx_alert_configs_severity ON alert_configs(severity);

CREATE INDEX IF NOT EXISTS idx_alert_instances_config_id ON alert_instances(alert_config_id);
CREATE INDEX IF NOT EXISTS idx_alert_instances_status ON alert_instances(status);
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered_at ON alert_instances(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_instances_severity ON alert_instances(severity);
