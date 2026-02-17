-- Registration Settings & Pending Registrations
-- Migration 035: Admin-controllable self-registration with optional approval workflow

-- ============================================================================
-- System-wide registration settings (singleton row, like email_settings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS registration_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- 'disabled' = no public registration
    -- 'approval_required' = users register but stay pending until admin approves
    registration_mode VARCHAR(30) NOT NULL DEFAULT 'disabled'
        CHECK (registration_mode IN ('disabled', 'approval_required')),
    -- Default role assigned to approved registrations
    default_role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(id)
);

COMMENT ON TABLE registration_settings IS 'Organisation-level toggle for public self-registration';

-- Seed the singleton row with registration disabled by default
INSERT INTO registration_settings (registration_mode) VALUES ('disabled')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Pending registrations (approval workflow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pending_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_status
    ON pending_registrations(status);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email
    ON pending_registrations(email);

COMMENT ON TABLE pending_registrations IS 'Holds self-registration requests awaiting admin approval';
