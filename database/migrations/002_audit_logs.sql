-- Migration: Add audit logging table
-- Created: 2026-02-01
-- Description: Create audit_logs table for security and compliance tracking

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Audit trail for security and compliance tracking';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., LOGIN_SUCCESS, LOGIN_FAILED, ACCOUNT_LOCKED, CREATE, UPDATE, DELETE)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (e.g., user, account, donation)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the resource affected';
COMMENT ON COLUMN audit_logs.details IS 'Additional details about the action';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN audit_logs.status IS 'Status of the action (success, failure, error)';
