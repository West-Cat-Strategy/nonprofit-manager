#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required for migration verification" >&2
  exit 1
fi

: "${DB_NAME:?DB_NAME is required}"

shopt -s nullglob

if [[ "${DB_NAME}" != *_test ]]; then
  echo "Refusing to run migrations unless DB_NAME ends with _test" >&2
  exit 1
fi

export PGHOST="${DB_HOST:-localhost}"
export PGPORT="${DB_PORT:-5432}"
export PGDATABASE="${DB_NAME}"
export PGUSER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

migrations=("${root_dir}"/database/migrations/*.sql)

if [[ ${#migrations[@]} -eq 0 ]]; then
  echo "No migration files found in database/migrations" >&2
  exit 1
fi

echo "==> Verifying migrations against ${PGDATABASE}"

for file in "${migrations[@]}"; do
  echo "==> Applying ${file##*/}"
  psql -v ON_ERROR_STOP=1 -f "$file" >/dev/null
done

exit 0
