# P5-T56 Production Worker Runtime Proof - 2026-05-03

## Scope

`P5-T56` added a first-class production Docker worker service for the existing background worker entrypoint.

## Implementation

- Added a production `worker` service in `docker-compose.yml`.
- The worker uses the existing backend image and runs `node dist/worker.js`.
- The worker has no exposed HTTP port and does not add scheduler behavior.
- Production and backend env templates now document the worker scheduler toggles used by scheduled reports, reminders, local campaign drain, public snapshot cleanup, social sync, and webhook retries.
- Runtime/deployment docs now describe the production worker role and preserve the existing Docker dev-footprint boundaries.

## Validation

- `RUNTIME_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.yml config -q` - passed.
- `RUNTIME_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.yml config --services` - passed and included `worker`.
- `RUNTIME_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.yml build --dry-run` - passed.
- `cd backend && npm run type-check` - passed.
- `./scripts/docker-build-images.sh build --dry-run` - passed.
- `./scripts/docker-build-images.sh validate --dry-run` - passed.
- `git diff --check -- docker-compose.yml .env.production.example backend/.env.example docs/deployment/DEPLOYMENT.md docs/development/GETTING_STARTED.md` - passed.
- May 4 closeout: `make docker-build` - passed; built `nonprofit-manager-backend:latest` and `nonprofit-manager-frontend:latest`.
- May 4 closeout: `make docker-validate` - passed; Dockerfile validation completed successfully after rebuilding backend and frontend images.
- May 4 closeout: `make lint`, `make typecheck`, `npm run knip`, and `git diff --check` - passed.

## Notes

- The earlier Docker-daemon blocker at `/Users/bryan/.docker/run/docker.sock` was cleared by starting Docker Desktop for the May 4 closeout.
