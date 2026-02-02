-- Migration: Add saved_reports table
-- Description: Create table for storing saved report definitions

CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  entity VARCHAR(50) NOT NULL CHECK (entity IN ('accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks')),
  report_definition JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE,
  CONSTRAINT saved_reports_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

-- Index for faster lookups by entity and user
CREATE INDEX idx_saved_reports_entity ON saved_reports(entity);
CREATE INDEX idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_created_at ON saved_reports(created_at DESC);

-- Index for public reports
CREATE INDEX idx_saved_reports_public ON saved_reports(is_public) WHERE is_public = TRUE;

COMMENT ON TABLE saved_reports IS 'Stores saved report definitions for reuse';
COMMENT ON COLUMN saved_reports.report_definition IS 'JSONB object containing fields, filters, sort, and limit';
COMMENT ON COLUMN saved_reports.is_public IS 'Whether this report is accessible to all users or just the creator';
