-- Migration: Portal activity logs
-- Description: Track recent portal user actions for staff visibility

CREATE TABLE IF NOT EXISTS portal_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portal_user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_activity_user ON portal_activity_logs(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_activity_created ON portal_activity_logs(created_at DESC);
