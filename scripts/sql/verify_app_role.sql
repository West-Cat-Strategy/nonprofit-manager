SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE',
  :'app_db_user',
  :'app_db_password'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = :'app_db_user'
)
\gexec

SELECT format(
  'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE',
  :'app_db_user',
  :'app_db_password'
)
\gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_db_user')
\gexec

SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_db_user')
\gexec

SELECT format(
  'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_account_access, public.accounts, public.contacts, public.donations, public.volunteers, public.events, public.event_occurrences TO %I',
  :'app_db_user'
)
\gexec
