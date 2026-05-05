# P5-T52 Docker Runtime Footprint Proof - 2026-05-03

## Scope

P5-T52 adds an explicit lean Docker dev path for daily API and staff-app work while preserving the existing full `make dev` stack.

## Implementation

- Added `make dev-lite` and `make docker-up-dev-lite` to start Postgres, Redis, backend API, and frontend only.
- Kept `make dev` and `make docker-up-dev` as the full-stack path with backend, frontend, public-site, Postgres, and Redis.
- Stopped stale `public-site-dev` and optional Caddy containers when starting the lean stack so the low-footprint path is explicit even after a prior full-stack run.
- Shared the backend dev image between backend API and public-site dev services.
- Retained separate backend API and public-site dev `node_modules` volumes after the isolated Docker smoke stack exposed a startup race when both services mounted the same dependency volume.
- Shared the production backend image declaration between backend API and public-site services while keeping separate runtime commands.
- Updated Docker runtime docs to distinguish lean app/API work, full public-site work, Caddy public-host work, and Docker E2E requirements.

## Validation

- Pass: `docker compose -f docker-compose.dev.yml config --quiet`
- Pass: production compose config check with dummy required env values.
- Pass: `docker compose --dry-run -f docker-compose.dev.yml build` plans one backend dev image build plus the frontend image build.
- Pass: production compose dry-run build plans one backend image build plus the frontend image build.
- Pass: `./scripts/docker-build-images.sh validate --dry-run`
- Pass: `make docker-up-dev-lite`; backend and frontend readiness passed, and `127.0.0.1:8006` was not listening.
- Runtime footprint snapshot: full stack included `nonprofit-dev-public-site-dev-1` at about `153.4MiB`; lean stack omitted that container and kept only backend, frontend, Postgres, and Redis running.
- Pass: `make docker-up-dev`; backend, frontend, and public-site readiness passed.
- Pass: backend API and public-site dev containers both used the same backend dev image while keeping separate dependency volumes. The isolated smoke stack uses its own `nonprofit-smoke-backend-dev:latest` image tag.
- Pass: `make test-e2e-docker-smoke`; 4 Chromium smoke tests passed.
- Pass: `make docker-build`
- Pass: `make docker-validate`
- Pass: `git diff --check`
- Pass: `make check-links`

## Notes

The attempted shared backend dependency volume failed during the first isolated smoke stack startup with a generated dependency-cache race under `/app/node_modules`. The final implementation keeps the runtime footprint win from omitting public-site/Caddy in `make dev-lite` and the build-planning win from sharing the backend image, while preserving separate dependency volumes for concurrent backend/public-site dev startup.
