-- Migration 072: Volunteer assignments
-- Creates the assignment table used by volunteer scheduling, calendar, and time-tracker flows.

CREATE TABLE IF NOT EXISTS volunteer_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  assignment_type VARCHAR(20) NOT NULL DEFAULT 'general',
  role VARCHAR(255),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  hours_logged NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT volunteer_assignments_assignment_type_check
    CHECK (assignment_type IN ('event', 'task', 'general')),
  CONSTRAINT volunteer_assignments_status_check
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_volunteer_id
  ON volunteer_assignments(volunteer_id);

CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_event_id
  ON volunteer_assignments(event_id);

CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_task_id
  ON volunteer_assignments(task_id);

CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_status
  ON volunteer_assignments(status);

CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_start_time
  ON volunteer_assignments(start_time DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_volunteer_assignments_updated_at'
  ) THEN
    CREATE TRIGGER update_volunteer_assignments_updated_at
      BEFORE UPDATE ON volunteer_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE volunteer_assignments IS 'Scheduled volunteer assignments for events, tasks, and general shifts';
COMMENT ON COLUMN volunteer_assignments.hours_logged IS 'Running total of hours recorded against the assignment';
