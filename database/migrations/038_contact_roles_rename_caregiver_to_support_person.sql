-- Migration 038: Rename Caregiver client subtype to Support Person
-- Also ensure Community Education subtype exists for client intake.

UPDATE contact_roles
SET name = 'Support Person', description = 'Client type: Support Person'
WHERE name = 'Caregiver'
  AND NOT EXISTS (
    SELECT 1 FROM contact_roles WHERE name = 'Support Person'
  );

INSERT INTO contact_roles (name, description, is_system)
VALUES
  ('Support Person', 'Client type: Support Person', true),
  ('Community Education', 'Client type: Community Education', true)
ON CONFLICT (name) DO NOTHING;
