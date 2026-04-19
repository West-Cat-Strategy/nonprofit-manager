BEGIN;
SELECT set_config('app.current_user_id', :'unknown_user_id', true);
SELECT COUNT(*) FROM accounts WHERE id = :'fixture_account_id';
SELECT COUNT(*) FROM contacts WHERE id = :'fixture_contact_id';
SELECT set_config('app.current_user_id', :'fixture_user_id', true);
SELECT COUNT(*) FROM accounts WHERE id = :'fixture_account_id';
SELECT COUNT(*) FROM contacts WHERE id = :'fixture_contact_id';
COMMIT;
