-- Backfill user_roles from users.role
-- Ensures existing users have role permissions aligned with their role string

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = u.role
ON CONFLICT DO NOTHING;
