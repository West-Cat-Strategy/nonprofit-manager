-- Migration: Add API key authentication system
-- Description: Create tables for API key management with scopes and rate limiting

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    key_hash VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 hash of the actual key (never stored plaintext)
    key_prefix VARCHAR(10) NOT NULL,        -- First 10 chars of key for UI display (e.g., "app_abc123...")
    scopes TEXT[] NOT NULL DEFAULT '{}',    -- Array of permission scopes
    rate_limit_requests INT DEFAULT 1000,   -- Max requests per hour
    rate_limit_interval_ms INT DEFAULT 3600000,  -- 1 hour
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,    -- Optional expiration
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT api_keys_organization_name_unique UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- API Key Activity/Usage Log
CREATE TABLE IF NOT EXISTS api_key_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,        -- /api/donations, /api/contacts, etc.
    method VARCHAR(10) NOT NULL,            -- GET, POST, PUT, DELETE
    status_code INT NOT NULL,               -- HTTP status code
    ip_address VARCHAR(45),                 -- IP address of requester
    user_agent TEXT,                        -- User-Agent header
    response_time_ms INT,                   -- How long the request took
    error_message TEXT,                     -- If error, the message
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id ON api_key_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage_log(created_at);

-- Rate limit tracking for API keys
CREATE TABLE IF NOT EXISTS api_key_rate_limit_state (
    api_key_id UUID PRIMARY KEY REFERENCES api_keys(id) ON DELETE CASCADE,
    request_count INT NOT NULL DEFAULT 0,
    window_start_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Allowed scopes (reference table for documentation)
-- Scopes follow format: resource:action
-- Examples: donation:read, contact:write, report:export, webhook:manage
INSERT INTO permissions (name, description, resource, action) VALUES
    ('api_key:create', 'Create new API keys', 'api_keys', 'create'),
    ('api_key:read', 'Read API key metadata', 'api_keys', 'read'),
    ('api_key:revoke', 'Revoke API keys', 'api_keys', 'revoke'),
    ('donation:read', 'Read donation data', 'donations', 'read'),
    ('donation:write', 'Create/update donations', 'donations', 'write'),
    ('donation:export', 'Export donation data', 'donations', 'export'),
    ('contact:read', 'Read contact data', 'contacts', 'read'),
    ('contact:write', 'Create/update contacts', 'contacts', 'write'),
    ('contact:export', 'Export contact data', 'contacts', 'export'),
    ('report:read', 'Read reports', 'reports', 'read'),
    ('webhook:manage', 'Manage webhooks', 'webhooks', 'manage'),
    ('account:read', 'Read account info', 'accounts', 'read')
ON CONFLICT (name) DO NOTHING;
