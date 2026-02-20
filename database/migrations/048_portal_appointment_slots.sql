-- Migration 048: Portal appointment availability slots and appointment context

CREATE TABLE IF NOT EXISTS appointment_availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pointperson_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  title VARCHAR(255),
  details TEXT,
  location VARCHAR(255),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, closed, cancelled
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT appointment_slots_status_check CHECK (status IN ('open', 'closed', 'cancelled')),
  CONSTRAINT appointment_slots_capacity_check CHECK (capacity > 0),
  CONSTRAINT appointment_slots_booked_count_check CHECK (booked_count >= 0),
  CONSTRAINT appointment_slots_time_check CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointment_slots_pointperson
  ON appointment_availability_slots(pointperson_user_id, status, start_time);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_case
  ON appointment_availability_slots(case_id, status, start_time);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_start
  ON appointment_availability_slots(start_time);

CREATE TRIGGER update_appointment_availability_slots_updated_at
  BEFORE UPDATE ON appointment_availability_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pointperson_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES appointment_availability_slots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_type VARCHAR(30) NOT NULL DEFAULT 'manual_request'; -- manual_request, slot_booking

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_request_type_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_request_type_check
      CHECK (request_type IN ('manual_request', 'slot_booking'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_case_id ON appointments(case_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pointperson ON appointments(pointperson_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot_id ON appointments(slot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_request_type ON appointments(request_type);

COMMENT ON TABLE appointment_availability_slots IS 'Staff-published appointment slots that portal clients can book';
COMMENT ON COLUMN appointments.request_type IS 'How appointment was created: manual_request or slot_booking';
COMMENT ON COLUMN appointments.slot_id IS 'Optional foreign key to booked availability slot';
