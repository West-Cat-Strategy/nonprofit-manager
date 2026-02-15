-- Create report_templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  entity VARCHAR(50) NOT NULL,
  template_definition JSONB NOT NULL,
  parameters JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  preview_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique constraint for system templates
CREATE UNIQUE INDEX idx_system_template_name ON report_templates (name) WHERE is_system = true;

-- Create index on category for filtering
CREATE INDEX idx_template_category ON report_templates (category);

-- Create index on entity
CREATE INDEX idx_template_entity ON report_templates (entity);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_report_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_templates_updated_at
BEFORE UPDATE ON report_templates
FOR EACH ROW
EXECUTE FUNCTION update_report_templates_updated_at();
