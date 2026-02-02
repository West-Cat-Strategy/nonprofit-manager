/**
 * Migration: Volunteer Hours Tracking
 * Creates the volunteer_hours table for tracking volunteer time
 */

-- Create volunteer_hours table
CREATE TABLE IF NOT EXISTS volunteer_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  hours_logged DECIMAL(10,2) NOT NULL,
  activity_date DATE NOT NULL,
  activity_type VARCHAR(100),
  description TEXT,
  notes TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for volunteer_hours
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_volunteer_id ON volunteer_hours(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_activity_date ON volunteer_hours(activity_date);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_verified ON volunteer_hours(verified);

-- Add comments
COMMENT ON TABLE volunteer_hours IS 'Tracks volunteer hours and activities';
COMMENT ON COLUMN volunteer_hours.volunteer_id IS 'Reference to the volunteer';
COMMENT ON COLUMN volunteer_hours.hours_logged IS 'Number of hours worked';
COMMENT ON COLUMN volunteer_hours.activity_date IS 'Date the volunteer activity occurred';
COMMENT ON COLUMN volunteer_hours.activity_type IS 'Type of volunteer activity';
COMMENT ON COLUMN volunteer_hours.verified IS 'Whether the hours have been verified by staff';
