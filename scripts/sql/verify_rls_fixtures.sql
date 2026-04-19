INSERT INTO users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  is_active
)
VALUES (
  :'fixture_user_id',
  'rls-verifier@example.test',
  'verification-only',
  'RLS',
  'Verifier',
  'user',
  true
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

INSERT INTO accounts (
  id,
  account_number,
  account_name,
  is_active,
  created_by,
  modified_by
)
VALUES (
  :'fixture_account_id',
  'VERIFY-RLS-ACCOUNT',
  'RLS Verification Account',
  true,
  :'fixture_user_id',
  :'fixture_user_id'
)
ON CONFLICT (id) DO UPDATE
SET account_number = EXCLUDED.account_number,
    account_name = EXCLUDED.account_name,
    is_active = EXCLUDED.is_active,
    created_by = EXCLUDED.created_by,
    modified_by = EXCLUDED.modified_by;

INSERT INTO contacts (
  id,
  account_id,
  first_name,
  last_name,
  email,
  is_active,
  created_by,
  modified_by
)
VALUES (
  :'fixture_contact_id',
  :'fixture_account_id',
  'Scoped',
  'Contact',
  'rls-contact@example.test',
  true,
  :'fixture_user_id',
  :'fixture_user_id'
)
ON CONFLICT (id) DO UPDATE
SET account_id = EXCLUDED.account_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active,
    created_by = EXCLUDED.created_by,
    modified_by = EXCLUDED.modified_by;

INSERT INTO user_account_access (
  id,
  user_id,
  account_id,
  access_level,
  granted_by,
  is_active
)
VALUES (
  :'fixture_access_id',
  :'fixture_user_id',
  :'fixture_account_id',
  'viewer',
  :'fixture_user_id',
  true
)
ON CONFLICT (user_id, account_id) DO UPDATE
SET access_level = EXCLUDED.access_level,
    granted_by = EXCLUDED.granted_by,
    is_active = EXCLUDED.is_active;
