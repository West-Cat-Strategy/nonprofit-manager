-- User Invitations table for inviting new users via link
-- Migration 015: User Invitations

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES users(id),
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    message TEXT, -- Optional message to include with invitation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) NOT NULL
);

-- Index for looking up invitations by token (used during acceptance)
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);

-- Index for looking up invitations by email (to check for existing invitations)
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);

-- Index for listing pending invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_pending ON user_invitations(is_revoked, accepted_at, expires_at);

-- Add comment
COMMENT ON TABLE user_invitations IS 'Stores user invitation tokens for onboarding new users via invitation link';
COMMENT ON COLUMN user_invitations.token IS 'Unique secure token used in the invitation URL';
COMMENT ON COLUMN user_invitations.expires_at IS 'Invitation expiration timestamp (default 7 days from creation)';
COMMENT ON COLUMN user_invitations.accepted_at IS 'When the invitation was accepted and user was created';
COMMENT ON COLUMN user_invitations.message IS 'Optional personal message from the admin to include in the invitation';
