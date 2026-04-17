-- Portal password reset tokens
-- Migration 095: add dedicated forgot-password support for portal users

CREATE TABLE IF NOT EXISTS portal_password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portal_user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_password_reset_tokens_user
    ON portal_password_reset_tokens(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_password_reset_tokens_expires
    ON portal_password_reset_tokens(expires_at);

COMMENT ON TABLE portal_password_reset_tokens IS 'Short-lived tokens for the portal forgot-password flow';
