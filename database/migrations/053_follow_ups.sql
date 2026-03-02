-- Migration 053: Follow-up lifecycle and reminder notifications

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('case', 'task')),
    entity_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    frequency VARCHAR(20) NOT NULL DEFAULT 'once' CHECK (frequency IN ('once', 'daily', 'weekly', 'biweekly', 'monthly')),
    frequency_end_date DATE,
    method VARCHAR(20) CHECK (method IN ('phone', 'email', 'in_person', 'video_call', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    completed_date TIMESTAMP WITH TIME ZONE,
    completed_notes TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    reminder_minutes_before INTEGER CHECK (reminder_minutes_before IS NULL OR reminder_minutes_before >= 0),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_org ON follow_ups(organization_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_entity ON follow_ups(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status_date ON follow_ups(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_schedule_order ON follow_ups(scheduled_date ASC, scheduled_time ASC);

CREATE TABLE IF NOT EXISTS follow_up_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    follow_up_id UUID NOT NULL REFERENCES follow_ups(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    recipient_email VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_follow_up_notifications_follow_up
    ON follow_up_notifications(follow_up_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_notifications_org ON follow_up_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_notifications_follow_up ON follow_up_notifications(follow_up_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_notifications_due
    ON follow_up_notifications(status, scheduled_for)
    WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_follow_up_notifications_processing
    ON follow_up_notifications(processing_started_at)
    WHERE status = 'processing';

COMMENT ON TABLE follow_ups IS 'Scheduled follow-up lifecycle records for cases and tasks';
COMMENT ON TABLE follow_up_notifications IS 'Reminder delivery queue and audit records for follow-ups';
