-- Seed example data scopes (inactive by default)

INSERT INTO data_scopes (name, resource, scope_filter, role_id, priority, is_active)
SELECT
  'Staff (Example) - Own Records',
  'accounts',
  '{"createdByUserIds":[]}'::jsonb,
  r.id,
  50,
  false
FROM roles r
WHERE r.name = 'staff'
ON CONFLICT DO NOTHING;

INSERT INTO data_scopes (name, resource, scope_filter, role_id, priority, is_active)
SELECT
  'Staff (Example) - Own Records',
  'contacts',
  '{"createdByUserIds":[]}'::jsonb,
  r.id,
  50,
  false
FROM roles r
WHERE r.name = 'staff'
ON CONFLICT DO NOTHING;
