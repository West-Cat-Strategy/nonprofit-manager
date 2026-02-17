-- Email Settings & Password Reset Tokens
-- Migration 034: Add system email configuration and password reset support

-- ============================================================================
-- System email settings (SMTP/IMAP) — stored per-organization
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- SMTP (outbound)
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_secure BOOLEAN DEFAULT true,
    smtp_user VARCHAR(255),
    smtp_pass_encrypted TEXT,          -- encrypted at rest via app-level AES
    smtp_from_address VARCHAR(255),
    smtp_from_name VARCHAR(255),
    -- IMAP (inbound, optional)
    imap_host VARCHAR(255),
    imap_port INTEGER DEFAULT 993,
    imap_secure BOOLEAN DEFAULT true,
    imap_user VARCHAR(255),
    imap_pass_encrypted TEXT,
    -- Misc
    is_configured BOOLEAN DEFAULT false,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_test_success BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id)
);

COMMENT ON TABLE email_settings IS 'Organisation-level SMTP/IMAP configuration for transactional email';

-- ============================================================================
-- Password reset tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,        -- bcrypt hash of the token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
    ON password_reset_tokens(expires_at);

COMMENT ON TABLE password_reset_tokens IS 'Short-lived tokens for the forgot-password flow';

-- ============================================================================
-- Seed a single (unconfigured) email_settings row so queries never return empty
-- ============================================================================
INSERT INTO email_settings (id, is_configured)
VALUES ('00000000-0000-0000-0000-000000000001', false)
ON CONFLICT DO NOTHING;
