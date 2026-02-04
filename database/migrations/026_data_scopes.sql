-- Data scopes for row-level access filtering

CREATE TABLE IF NOT EXISTS data_scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    scope_filter JSONB NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_scopes_resource ON data_scopes(resource);
CREATE INDEX IF NOT EXISTS idx_data_scopes_role_id ON data_scopes(role_id);
CREATE INDEX IF NOT EXISTS idx_data_scopes_user_id ON data_scopes(user_id);
