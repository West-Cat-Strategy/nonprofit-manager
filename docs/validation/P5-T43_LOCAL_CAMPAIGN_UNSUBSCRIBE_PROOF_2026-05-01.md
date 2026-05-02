# P5-T43 Local Campaign Unsubscribe Proof

**Date:** 2026-05-01

## Scope

`P5-T43` adds unsubscribe support for local SMTP campaign recipients while keeping `P5-T6` as the Phase 5 backlog scope-control gate.

Implemented scope:

- Added signed stateless local campaign recipient unsubscribe tokens with payload version, campaign run id, recipient id, and normalized email hash.
- Added unauthenticated public GET/POST unsubscribe handling at `/api/v2/public/communications/unsubscribe/:token`; both methods now use the same no-leak recording path.
- Kept public responses generic so invalid, expired-by-data, missing-recipient, and repeated tokens do not reveal contact existence.
- Added a CSRF skip for the public communications unsubscribe route so one-click POST can work without an authenticated browser token.
- Added local SMTP campaign `List-Unsubscribe` and `List-Unsubscribe-Post` headers plus visible HTML/plain-text unsubscribe footer links.
- Generate local unsubscribe URLs from `API_ORIGIN` only, with a direct-runtime default of `http://localhost:3000`, so unsubscribe links always target the API runtime rather than the public-site or staff frontend origins.
- Set the Docker dev stack's default `API_ORIGIN` to the externally reachable backend origin, `http://localhost:8004`, with `DEV_API_ORIGIN` available for overrides.
- Recorded valid local unsubscribe requests as active contact suppression evidence with `channel=email`, `reason=unsubscribed`, `source=system`, `provider=local_email`, deterministic provider event ids, and `contacts.do_not_email` sync.
- Reused existing `campaign_run_recipients` and `contact_suppression_evidence` tables; no migration was needed.

Out of scope:

- Mailchimp parity rewrites, preference centers, tracking pixels, bounce or complaint ingestion, ROI attribution, typed appeals, memberships, donation batches, finance snapshots, automation canvas, and frontend UI changes.

## Interface Summary

Added public communications routes:

- `GET /api/v2/public/communications/unsubscribe/:token`
- `POST /api/v2/public/communications/unsubscribe/:token`

Local campaign emails now include:

- `List-Unsubscribe: <absolute unsubscribe URL>`
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
- HTML and plain-text unsubscribe footer links.

## Validation

Passed:

```bash
cd backend && npx jest --runTestsByPath src/modules/communications/__tests__/communicationsService.test.ts src/modules/communications/__tests__/unsubscribeService.test.ts src/modules/communications/__tests__/unsubscribeTokenService.test.ts src/modules/communications/__tests__/publicUnsubscribe.routes.test.ts src/modules/contacts/__tests__/contactSuppressionService.test.ts src/__tests__/services/emailService.test.ts src/__tests__/middleware/csrf.test.ts --runInBand
cd backend && npm run type-check
cd backend && npm run lint
docker compose -f docker-compose.dev.yml config | rg -n "backend-dev:|public-site-dev:|API_ORIGIN|SITE_BASE_URL|published: \"8004\"|published: \"8006\"|target: 3000|target: 8006"
make lint-route-validation
make lint-v2-module-ownership
node scripts/check-auth-guard-policy.ts
make check-links
make lint-doc-api-versioning
git diff --check
```

Current proof details:

- Focused Jest now covers the real `/api/v2` registrar path for unauthenticated one-click POST with URL-encoded tokens.
- Token hardening tests cover tampered signatures, invalid versions, malformed UUIDs, malformed email hashes, and non-canonical payload encodings.
- Docker dev config resolves `API_ORIGIN` to `http://localhost:8004` for both `backend-dev` and `public-site-dev`, matching the externally published backend port.
- The May 2 review pass narrowed the CSRF skip to `/api/v2/public/communications/unsubscribe` and added regression coverage proving other public communications POST paths remain CSRF-protected.

Worker-reported lane checks:

- `unsubscribe-contract`: focused unsubscribe service, public route, CSRF, and contact suppression tests; backend type-check; route validation policy; v2 ownership policy; targeted ESLint.
- `email-unsubscribe-headers`: focused communications/email service tests; API-origin URL proof; targeted ESLint.

Known validation notes:

- `cd backend && npm test -- --runInBand src/modules/communications/__tests__/publicUnsubscribe.routes.test.ts src/__tests__/middleware/csrf.test.ts` is blocked because the backend test wrapper requires Docker and Docker is unavailable at `/Users/bryan/.docker/run/docker.sock`; the direct `npx jest` equivalent passes.
- `make db-verify` is blocked by the same unavailable Docker socket before it can start the isolated database verification.
- Direct focused Jest emits the existing `--localstorage-file` warning while still passing.
