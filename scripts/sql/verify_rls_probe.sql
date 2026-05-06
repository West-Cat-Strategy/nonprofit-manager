BEGIN;
SELECT set_config('app.current_user_id', :'unknown_user_id', true);
SELECT COUNT(*) FROM accounts WHERE id = :'fixture_account_id';
SELECT COUNT(*) FROM contacts WHERE id = :'fixture_contact_id';
SELECT COUNT(*) FROM volunteers WHERE contact_id = :'fixture_contact_id';
SELECT set_config('app.current_user_id', :'fixture_user_id', true);
SELECT COUNT(*) FROM accounts WHERE id = :'fixture_account_id';
SELECT COUNT(*) FROM contacts WHERE id = :'fixture_contact_id';
SELECT COUNT(*) FROM volunteers WHERE contact_id = :'fixture_contact_id';
DELETE FROM volunteers WHERE contact_id = :'fixture_contact_id';
WITH inserted AS (
  INSERT INTO volunteers (
    contact_id,
    skills,
    volunteer_status,
    availability,
    availability_status,
    availability_notes,
    background_check_status,
    is_active,
    created_by,
    modified_by
  )
  VALUES (
    :'fixture_contact_id',
    ARRAY['RLS Probe']::text[],
    'active',
    NULL,
    'available',
    NULL,
    'approved',
    true,
    :'fixture_user_id',
    :'fixture_user_id'
  )
  RETURNING id
)
SELECT COUNT(*) FROM inserted;
WITH updated AS (
  UPDATE volunteers
  SET availability_status = 'limited',
      availability_notes = 'RLS probe update',
      modified_by = :'fixture_user_id'
  WHERE contact_id = :'fixture_contact_id'
  RETURNING id
)
SELECT COUNT(*) FROM updated;
WITH deleted AS (
  DELETE FROM volunteers
  WHERE contact_id = :'fixture_contact_id'
  RETURNING id
)
SELECT COUNT(*) FROM deleted;
SELECT set_config('app.current_user_id', :'fixture_admin_user_id', true);
WITH inserted AS (
  INSERT INTO accounts (
    id,
    account_number,
    account_name,
    account_type,
    is_active,
    created_by,
    modified_by
  )
  VALUES (
    :'fixture_admin_write_account_id',
    'VERIFY-RLS-ADMIN-WRITE',
    'RLS Admin Write Account From App Role',
    'organization',
    true,
    :'fixture_admin_user_id',
    :'fixture_admin_user_id'
  )
  ON CONFLICT (id) DO UPDATE
  SET account_name = EXCLUDED.account_name,
      modified_by = EXCLUDED.modified_by,
      updated_at = CURRENT_TIMESTAMP
  RETURNING id
)
SELECT COUNT(*) FROM inserted;
WITH updated AS (
  UPDATE accounts
  SET account_name = 'RLS Admin Updated Account',
      modified_by = :'fixture_admin_user_id',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = :'fixture_account_id'
  RETURNING id
)
SELECT COUNT(*) FROM updated;
SELECT set_config('app.current_user_id', :'fixture_non_admin_user_id', true);
WITH updated AS (
  UPDATE accounts
  SET account_name = 'RLS Non Admin Update Should Not Apply',
      modified_by = :'fixture_non_admin_user_id',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = :'fixture_account_id'
  RETURNING id
)
SELECT COUNT(*) FROM updated;
SELECT set_config('app.current_user_id', :'fixture_admin_user_id', true);
WITH access_write AS (
  INSERT INTO user_account_access (
    user_id,
    account_id,
    access_level,
    granted_by,
    is_active
  )
  VALUES (
    :'fixture_access_target_user_id',
    :'fixture_account_id',
    'viewer',
    :'fixture_admin_user_id',
    true
  )
  ON CONFLICT (user_id, account_id) DO UPDATE
  SET access_level = EXCLUDED.access_level,
      granted_by = EXCLUDED.granted_by,
      is_active = EXCLUDED.is_active,
      granted_at = CURRENT_TIMESTAMP
  RETURNING id
)
SELECT COUNT(*) FROM access_write;
COMMIT;
