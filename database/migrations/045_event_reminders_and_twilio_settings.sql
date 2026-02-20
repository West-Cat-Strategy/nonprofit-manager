-- Event reminders + Twilio SMS settings
-- Migration 045: Add admin-managed Twilio credentials and event reminder delivery logging

-- ============================================================================
-- Twilio settings (singleton row, encrypted auth token)
-- ============================================================================
CREATE TABLE IF NOT EXISTS twilio_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_sid VARCHAR(64),
    auth_token_encrypted TEXT,
    messaging_service_sid VARCHAR(64),
    from_phone_number VARCHAR(32),
    is_configured BOOLEAN DEFAULT false,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_test_success BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id)
);

COMMENT ON TABLE twilio_settings IS 'Organization-level Twilio SMS configuration';

-- Seed singleton row (unconfigured)
INSERT INTO twilio_settings (id, is_configured)
VALUES ('00000000-0000-0000-0000-000000000002', false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Event reminder delivery log
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_reminder_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES event_registrations(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms')),
    recipient VARCHAR(255) NOT NULL,
    delivery_status VARCHAR(20) NOT NULL CHECK (delivery_status IN ('sent', 'failed', 'skipped')),
    error_message TEXT,
    message_preview VARCHAR(255),
    sent_by UUID REFERENCES users(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_reminder_deliveries_event
    ON event_reminder_deliveries(event_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_reminder_deliveries_registration
    ON event_reminder_deliveries(registration_id);

COMMENT ON TABLE event_reminder_deliveries IS 'Per-recipient delivery log for event reminder messages';
