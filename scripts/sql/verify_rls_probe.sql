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
COMMIT;
