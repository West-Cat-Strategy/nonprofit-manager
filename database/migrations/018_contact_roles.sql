-- Migration: Contact Roles
-- Description: Add contact roles with multi-role assignments

CREATE TABLE IF NOT EXISTS contact_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_role_assignments (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES contact_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (contact_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_role_assignments_contact
  ON contact_role_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_role_assignments_role
  ON contact_role_assignments(role_id);

INSERT INTO contact_roles (name, description, is_system) VALUES
  ('Board Member', 'Member of the board of directors', true),
  ('Member', 'General member of the organization', true),
  ('Committee Member', 'Serves on a committee', true),
  ('Staff', 'Staff member', true),
  ('Executive Director', 'Executive director or CEO', true),
  ('Volunteer', 'Volunteer', true),
  ('Donor', 'Donor', true),
  ('Primary Contact', 'Primary contact for an account', true)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE contact_roles IS 'Roles that can be assigned to contacts (multi-select)';
COMMENT ON TABLE contact_role_assignments IS 'Junction table for contact role assignments';
