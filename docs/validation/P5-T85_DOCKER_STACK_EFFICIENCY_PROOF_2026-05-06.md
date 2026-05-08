# P5-T85 Docker Stack Efficiency Proof

**Date:** 2026-05-06
**Row:** `P5-T85` Docker stack efficiency refactor and fresh rebuild
**Status:** Review

## Scope

This was a Docker-only efficiency and validation pass. It preserved the existing dirty worktree and the existing smoke-stack `DEV_NODE_ENV=test` setting, did not prune the global Docker build cache, did not reset production/Plausible/ELK/backup volumes, and did not upgrade optional third-party platform services.

## Implementation Notes

- `backend/Dockerfile` now separates the Node runtime base from the npm tooling base. Build and dependency stages still get the pinned npm toolchain, while the final production backend image is built from the slimmer runtime base and no longer carries the global npm install layer.
- `frontend/Dockerfile` now uses `nginx:1.30-alpine-slim@sha256:2fb5d772cea6ef1a8dab525df1b9485289eee167d26af9613fce27a12c060caa` for production and removes the image-local `apk upgrade` layer.
- Compose and Make surfaces now expose explicit dev/prod frontend image tags, keep backend/public-site/frontend dev `node_modules` volumes separate, and keep `DEV_NODE_ENV=test` in the isolated smoke-stack environment.
- `scripts/docker-validate-overlays.sh` validates dev, dev+Caddy, production, host-access, self-hosted DB, encrypted DB, Plausible, ELK, and the Caddyfile. Optional Plausible/ELK checks use the example env files through `PLAUSIBLE_ENV_FILE` and `ELK_ENV_FILE`, so local copied secret files are not required for config validation.
- 2026-05-08 follow-up: the deferred Docker CI/audit sweep used a fresh `nonprofit-dev` review stack with `DEV_NODE_ENV=test`, `DEV_BYPASS_REGISTRATION_POLICY_IN_TEST=true`, and `DEV_BYPASS_MFA_FOR_TESTS=true`. The only code change was an E2E fixture fallback for public case-form access links when the Docker review stack intentionally has no SMTP provider configured; no Dockerfile, Compose overlay, deployment, or pinned-image production changes were needed.

## Validation

| Check | Result |
|---|---|
| `make docker-validate-overlays` | Pass. Covered dev, dev+Caddy, production, host-access, self-hosted DB, encrypted DB, Plausible with `.env.plausible.example`, ELK with `.env.elk.example`, and Caddyfile validation. |
| `docker run --rm nginx:1.30-alpine-slim@sha256:2fb5d772cea6ef1a8dab525df1b9485289eee167d26af9613fce27a12c060caa sh -lc 'command -v wget && nginx -v'` | Pass: `/usr/bin/wget`; `nginx version: nginx/1.30.0`. |
| `make docker-build` | Pass. Rebuilt `nonprofit-manager-backend:latest` and `nonprofit-manager-frontend:latest`. |
| `make docker-validate` | Pass. Full no-cache Dockerfile validation completed for backend/frontend stages. |
| `docker history nonprofit-manager-backend:latest` | Pass. Final runtime history no longer contains the global npm install layer; production layers are app dist, production dependencies, app directories, and the Node runtime base. |
| `docker images` | Rebuilt app sizes: backend `476MB`; frontend `28.4MB`. Previous local app sizes before this pass were backend `502MB` and frontend `101MB`. |
| `docker scout quickview nonprofit-manager-backend:latest` | `0C 1H 4M 0L`; base image `node:24-alpine` also `0C 1H 4M 0L`. |
| `docker scout quickview nonprofit-manager-frontend:latest` | `0C 0H 1M 0L`; base image `nginx:1.30-alpine-slim` also `0C 0H 1M 0L`. |
| `docker scout quickview nginx:1.30-alpine-slim@sha256:2fb5d772cea6ef1a8dab525df1b9485289eee167d26af9613fce27a12c060caa` | `0C 0H 1M 0L`. |
| `docker scout quickview postgres:18-alpine@sha256:54451ecb8ab38c24c3ec123f2fd501303a3a1856a5c66e98cecf2460d5e1e9d7` | `1C 12H 23M 3L`; version intentionally unchanged in this pass. |
| `docker scout quickview redis:8-alpine@sha256:c5e375abb885e6b2021c0377879e4890bf76f9065b8922ffc113f2b226b9fc17` | `0C 0H 1M 0L`. |
| `docker scout quickview caddy:2-alpine` | `2C 12H 17M 3L`; version intentionally unchanged in this pass. |
| `docker compose -p nonprofit-dev -f docker-compose.dev.yml down --remove-orphans --volumes` | Pass. Fresh reset applied only to the local `nonprofit-dev` dev stack. |
| `docker compose -p nonprofit-dev -f docker-compose.dev.yml build --no-cache backend-dev frontend-dev` | Pass. Rebuilt dev images: backend-dev `648MB`; frontend-dev `776MB`. |
| `make dev` | Pass. Started backend, frontend, public-site, Postgres, and Redis; readiness passed for `http://127.0.0.1:8004/health/ready`, `http://127.0.0.1:8005`, and `http://127.0.0.1:8006/health/ready`. |
| Direct runtime probes | Pass. Backend `8004` returned healthy DB/Redis checks, frontend `8005` returned HTTP `200`, and public-site `8006` returned healthy DB/Redis checks. |
| Production frontend nginx smoke | Pass. A temporary `nonprofit-manager-frontend:latest` container with a mock `backend:8000` proved `/health` returned `healthy`, SPA fallback returned `200`, and `/api/v2/proof` proxied to the backend mock. |
| `make docker-up-caddy` | Blocked locally on host port `443`: `ports are not available: exposing port TCP 0.0.0.0:443 -> 127.0.0.1:0: listen tcp 0.0.0.0:443: bind: address already in use`. The failed Caddy container and Caddy volumes created by the attempt were removed afterward. |
| `make test-e2e-docker-smoke` | Pass. Isolated `nonprofit-smoke` stack passed readiness on `18004`, `18005`, and `18006`; Playwright ran 4 tests and all passed. The smoke stack was removed by the target cleanup. |
| `docker compose -p nonprofit-dev -f docker-compose.dev.yml down --remove-orphans --volumes && DEV_NODE_ENV=test DEV_BYPASS_REGISTRATION_POLICY_IN_TEST=true DEV_BYPASS_MFA_FOR_TESTS=true make docker-up-dev` | Pass. Recreated the local review stack from clean volumes; readiness passed on backend `8004`, frontend `8005`, and public-site `8006`. |
| `cd e2e && npm run test:docker:ci` | Completed with two rerun-clean Firefox failures. The desktop matrix ran for 47.4 minutes and reported `988 passed`, `15 skipped`, and `2 failed`; failures were Firefox-only route console-error checks for `/settings/api` and portal high-traffic navigation, while Chromium/WebKit coverage passed and no Dockerfile, Compose overlay, script, or pinned-image policy defect was found. |
| `cd e2e && bash ../scripts/e2e-playwright.sh docker ../node_modules/.bin/playwright test --project=firefox tests/link-health.spec.ts tests/ux-regression.spec.ts --grep "loads /settings/api\|portal high-traffic routes remain navigable with headings"` | Pass. Focused rerun of the exact Firefox failures passed: 2 tests in 9.5 seconds. |
| `cd e2e && npm run test:docker:ci:mobile` | Pass. Mobile Docker tail passed: 3 tests in 13.2 seconds. |
| `cd e2e && npm run test:docker:audit` | Pass after E2E fixture fallback. Initial run reached the dark-mode/public-route sweep but blocked on unconfigured SMTP while creating the public case-form fixture; the scoped fixture fallback now provisions the access token through the test database, and the rerun passed the 152-route audit in 3.0 minutes. |
| `make check-links` | Pass. Checked 208 files and 1573 local links; no broken active-doc links found. |
| `git diff --check` | Pass. No whitespace errors reported. |

## Current Local Runtime State

- `nonprofit-dev-backend-dev-1`: running and healthy on `8004`.
- `nonprofit-dev-frontend-dev-1`: running and healthy on `8005`.
- `nonprofit-dev-public-site-dev-1`: running and healthy on `8006`.
- `nonprofit-dev-postgres-1`: running and healthy on `8002`.
- `nonprofit-dev-redis-1`: running and healthy on `8003`.
- Separate dev dependency volumes exist for backend, frontend, and public-site: `nonprofit-dev_backend-dev-node-modules`, `nonprofit-dev_frontend-dev-node-modules`, and `nonprofit-dev_public-site-dev-node-modules`.
