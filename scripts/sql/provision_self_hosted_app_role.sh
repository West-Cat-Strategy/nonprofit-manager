#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${POSTGRES_APP_USER:-}" ]]; then
  echo "POSTGRES_APP_USER must be set for self-hosted production app-role provisioning" >&2
  exit 1
fi

if [[ "$POSTGRES_APP_USER" == "postgres" ]]; then
  echo "POSTGRES_APP_USER must not be postgres for production app connections" >&2
  exit 1
fi

if [[ -z "${POSTGRES_APP_PASSWORD:-}" ]]; then
  echo "POSTGRES_APP_PASSWORD must be set for self-hosted production app-role provisioning" >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER:-postgres}" \
  --dbname "${POSTGRES_DB:-nonprofit_manager}" \
  -v app_db_user="$POSTGRES_APP_USER" \
  -v app_db_password="$POSTGRES_APP_PASSWORD" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION',
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
  'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'app_db_user',
  :'app_db_password'
)
\gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_db_user')
\gexec

SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_db_user')
\gexec

SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'app_db_user')
\gexec

SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', :'app_db_user')
\gexec

SELECT format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO %I', :'app_db_user')
\gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'app_db_user'
)
\gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
  :'app_db_user'
)
\gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO %I',
  :'app_db_user'
)
\gexec
SQL
