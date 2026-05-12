# P5-T110 Open-Source Service Posture Proof - 2026-05-12

## Scope

Implemented the approved open-source-first provider posture without removing working proprietary compatibility paths.

## Changes

- Communications keeps `local_email` as the default provider, adds `mautic` to the provider-neutral backend and frontend types, exposes Mautic segments through `GET /api/v2/communications/audiences?scope=provider`, and adds `POST /api/v2/communications/sync/bulk` for Mautic/Mailchimp contact sync.
- Mautic is explicitly sync-only in this pass. Staff campaign create/test-send requests with `provider: "mautic"` return validation errors instead of silently falling back to local delivery.
- Mailchimp routes under `/api/v2/mailchimp/*` remain as optional external-provider compatibility, including existing unsupported cancel/reschedule behavior.
- Error tracking keeps `@sentry/node` but now documents and logs the seam as Sentry-compatible, prefers GlitchTip in env examples, avoids logging full DSNs, and sets provider user context with user ID only.
- Plausible docs/env examples now prefer self-hosted Plausible CE while documenting Plausible Cloud as the `PLAUSIBLE_API_HOST=https://plausible.io` opt-in.
- Added an optional OpenSearch/Data Prepper/OpenSearch Dashboards overlay as the preferred self-hosted Elastic-compatible log path. The existing ELK overlay remains legacy transition support.

## Validation

| Command | Result | Notes |
|---|---|---|
| `cd backend && npx jest --runTestsByPath src/modules/communications/__tests__/communicationsService.test.ts src/__tests__/services/mauticService.test.ts src/__tests__/config/sentry.test.ts --runInBand` | Passed | 3 suites, 32 tests. Covered Mautic status/audiences/sync, sync-only campaign gating, Mautic URL safety, and Sentry-compatible DSN/redaction/user-context behavior. |
| `cd frontend && npx vitest run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx` | Passed | 1 file, 18 tests. Covered Mailchimp optional sync and Mautic preferred sync UI with campaign creation disabled. |
| `cd backend && npm run type-check` | Passed | Backend TypeScript check passed. |
| `cd frontend && npm run type-check` | Passed | Frontend TypeScript check passed after narrowing the sync provider before dispatch. |
| `node scripts/check-docker-image-policy.mjs` | Passed | 28 tracked image references after adding the OpenSearch/Data Prepper/Dashboards overlay. |
| `make docker-validate-overlays` | Passed | Dev, dev+Caddy, production, host-access, self-hosted DB, encrypted DB, Plausible CE, OpenSearch, legacy ELK, and Caddyfile config validation passed. |
| `make check-links` | Passed | 235 files and 1477 active-doc local links checked. |
| `make lint-doc-api-versioning` | Passed | 235 active-doc files checked. |
| `make lint-openapi` | Passed | OpenAPI contract check passed; no OpenAPI changes were required. |
| `make test-tooling` | Passed after focused test-contract update | The first run exposed a current `.gitignore` expectation mismatch where `git check-ignore` reports the broader `output/` rule; the tooling contract now accepts the current broader rule and passes 43 tests. |
