-- Migration: 004_permissions.sql
-- Description: Add role-based permissions and field-level access control

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,  -- System roles cannot be deleted
    priority INTEGER DEFAULT 0,       -- Higher priority roles take precedence
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,    -- accounts, contacts, donations, etc.
    action VARCHAR(50) NOT NULL,      -- create, read, update, delete, export
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (role_id, permission_id)
);

-- Create user_roles junction table (allows multiple roles per user)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Create field_access_rules table for field-level permissions
CREATE TABLE IF NOT EXISTS field_access_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource VARCHAR(50) NOT NULL,        -- accounts, contacts, donations, etc.
    field_name VARCHAR(100) NOT NULL,     -- Specific field (e.g., tax_id, email)
    can_read BOOLEAN DEFAULT true,
    can_write BOOLEAN DEFAULT false,
    mask_on_read BOOLEAN DEFAULT false,   -- Whether to mask the field value
    mask_type VARCHAR(20),                -- email, phone, ssn, partial, full
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (role_id, resource, field_name)
);

-- Create sensitive field audit log for tracking access to sensitive data
CREATE TABLE IF NOT EXISTS sensitive_field_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    access_type VARCHAR(20) NOT NULL,     -- read, write, decrypt
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system roles
INSERT INTO roles (name, description, is_system, priority) VALUES
    ('admin', 'Full system administrator with all permissions', true, 100),
    ('manager', 'Can manage most resources and view sensitive data', true, 80),
    ('staff', 'Regular staff member with limited access', true, 50),
    ('volunteer', 'Volunteer with minimal access', true, 20),
    ('viewer', 'Read-only access to non-sensitive data', true, 10)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
    -- Account permissions
    ('accounts.create', 'accounts', 'create', 'Create new accounts'),
    ('accounts.read', 'accounts', 'read', 'View accounts'),
    ('accounts.update', 'accounts', 'update', 'Update accounts'),
    ('accounts.delete', 'accounts', 'delete', 'Delete accounts'),
    ('accounts.export', 'accounts', 'export', 'Export account data'),

    -- Contact permissions
    ('contacts.create', 'contacts', 'create', 'Create new contacts'),
    ('contacts.read', 'contacts', 'read', 'View contacts'),
    ('contacts.update', 'contacts', 'update', 'Update contacts'),
    ('contacts.delete', 'contacts', 'delete', 'Delete contacts'),
    ('contacts.export', 'contacts', 'export', 'Export contact data'),

    -- Donation permissions
    ('donations.create', 'donations', 'create', 'Create new donations'),
    ('donations.read', 'donations', 'read', 'View donations'),
    ('donations.update', 'donations', 'update', 'Update donations'),
    ('donations.delete', 'donations', 'delete', 'Delete donations'),
    ('donations.export', 'donations', 'export', 'Export donation data'),

    -- Event permissions
    ('events.create', 'events', 'create', 'Create new events'),
    ('events.read', 'events', 'read', 'View events'),
    ('events.update', 'events', 'update', 'Update events'),
    ('events.delete', 'events', 'delete', 'Delete events'),
    ('events.manage_registrations', 'events', 'manage_registrations', 'Manage event registrations'),

    -- Task permissions
    ('tasks.create', 'tasks', 'create', 'Create new tasks'),
    ('tasks.read', 'tasks', 'read', 'View tasks'),
    ('tasks.update', 'tasks', 'update', 'Update tasks'),
    ('tasks.delete', 'tasks', 'delete', 'Delete tasks'),

    -- Volunteer permissions
    ('volunteers.create', 'volunteers', 'create', 'Create volunteer records'),
    ('volunteers.read', 'volunteers', 'read', 'View volunteers'),
    ('volunteers.update', 'volunteers', 'update', 'Update volunteers'),
    ('volunteers.delete', 'volunteers', 'delete', 'Delete volunteers'),
    ('volunteers.manage_assignments', 'volunteers', 'manage_assignments', 'Manage volunteer assignments'),

    -- User/Admin permissions
    ('users.manage', 'users', 'manage', 'Manage user accounts'),
    ('roles.manage', 'roles', 'manage', 'Manage roles and permissions'),
    ('system.admin', 'system', 'admin', 'Full system administration')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign permissions to manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.name NOT IN ('users.manage', 'roles.manage', 'system.admin')
ON CONFLICT DO NOTHING;

-- Assign permissions to staff role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'staff'
  AND p.action IN ('create', 'read', 'update')
  AND p.resource NOT IN ('users', 'roles', 'system')
ON CONFLICT DO NOTHING;

-- Assign permissions to volunteer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'volunteer'
  AND p.action = 'read'
  AND p.resource IN ('events', 'tasks')
ON CONFLICT DO NOTHING;

-- Assign permissions to viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- Setup field-level access rules for sensitive fields
-- Admin has full access (no rules needed - they see everything)

-- Manager field access (can see most but some fields masked)
INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'accounts', 'tax_id', true, true, false, null
FROM roles r WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'donations', 'transaction_id', true, false, false, null
FROM roles r WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- Staff field access (limited sensitive field access)
INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'accounts', 'tax_id', true, false, true, 'partial'
FROM roles r WHERE r.name = 'staff'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'contacts', 'email', true, true, false, null
FROM roles r WHERE r.name = 'staff'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'contacts', 'phone', true, true, true, 'phone'
FROM roles r WHERE r.name = 'staff'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'donations', 'amount', true, false, false, null
FROM roles r WHERE r.name = 'staff'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'donations', 'transaction_id', true, false, true, 'partial'
FROM roles r WHERE r.name = 'staff'
ON CONFLICT DO NOTHING;

-- Volunteer field access (very limited)
INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'contacts', 'email', true, false, true, 'email'
FROM roles r WHERE r.name = 'volunteer'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'contacts', 'phone', true, false, true, 'phone'
FROM roles r WHERE r.name = 'volunteer'
ON CONFLICT DO NOTHING;

-- Viewer field access (no sensitive data)
INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'accounts', 'tax_id', false, false, false, null
FROM roles r WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'contacts', 'email', true, false, true, 'email'
FROM roles r WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'contacts', 'phone', true, false, true, 'phone'
FROM roles r WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'donations', 'amount', true, false, true, 'partial'
FROM roles r WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

INSERT INTO field_access_rules (role_id, resource, field_name, can_read, can_write, mask_on_read, mask_type)
SELECT r.id, 'donations', 'transaction_id', false, false, false, null
FROM roles r WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_field_access_rules_role_resource ON field_access_rules(role_id, resource);
CREATE INDEX IF NOT EXISTS idx_sensitive_field_access_log_user_id ON sensitive_field_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_field_access_log_resource ON sensitive_field_access_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_field_access_log_accessed_at ON sensitive_field_access_log(accessed_at);

-- Function to get all permissions for a user (considering all their roles)
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param UUID)
RETURNS TABLE (
    permission_name VARCHAR(100),
    resource VARCHAR(50),
    action VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name, p.resource, p.action
    FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id_param UUID, permission_name_param VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = user_id_param AND p.name = permission_name_param
    ) INTO has_perm;
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- Function to get field access rules for a user's highest priority role
CREATE OR REPLACE FUNCTION get_field_access_for_user(user_id_param UUID, resource_param VARCHAR(50))
RETURNS TABLE (
    field_name VARCHAR(100),
    can_read BOOLEAN,
    can_write BOOLEAN,
    mask_on_read BOOLEAN,
    mask_type VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (far.field_name)
        far.field_name,
        far.can_read,
        far.can_write,
        far.mask_on_read,
        far.mask_type
    FROM field_access_rules far
    INNER JOIN roles r ON far.role_id = r.id
    INNER JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = user_id_param AND far.resource = resource_param
    ORDER BY far.field_name, r.priority DESC;
END;
$$ LANGUAGE plpgsql;
