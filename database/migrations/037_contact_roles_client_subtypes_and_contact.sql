-- Migration 037: Contact role updates for client intake flow
-- Adds roles needed by the updated add-person role selection UX.

INSERT INTO contact_roles (name, description, is_system) VALUES
  ('Contact', 'General contact person', true),
  ('Brain Injury Survivor', 'Client type: Brain Injury Survivor', true),
  ('Support Person', 'Client type: Support Person', true),
  ('Information', 'Client type: Information', true),
  ('Community Education', 'Client type: Community Education', true)
ON CONFLICT (name) DO NOTHING;
