#!/usr/bin/env bash
set -euo pipefail

gen_hex() {
  local bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
    return 0
  fi

  node -e "const crypto=require('crypto'); process.stdout.write(crypto.randomBytes(${bytes}).toString('hex'));"
}

gen_base64() {
  local bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 "$bytes" | tr -d '\n'
    return 0
  fi

  node -e "const crypto=require('crypto'); process.stdout.write(crypto.randomBytes(${bytes}).toString('base64url'));"
}

cat <<EOF
JWT_SECRET=$(gen_hex 32)
CSRF_SECRET=$(gen_hex 32)
ENCRYPTION_KEY=$(gen_hex 32)
DB_PASSWORD=$(gen_hex 24)
SESSION_SECRET=$(gen_base64 32)
STRIPE_WEBHOOK_SECRET=whsec_$(gen_hex 24)
EOF

