-- Migration 036: Contact preferred name + people role updates
-- Adds preferred_name to contacts and ensures Client role exists.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(100);

COMMENT ON COLUMN contacts.preferred_name IS 'Preferred/used name for display and search';

INSERT INTO contact_roles (name, description, is_system)
VALUES ('Client', 'Client receiving services', true)
ON CONFLICT (name) DO NOTHING;
