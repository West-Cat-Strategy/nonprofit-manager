# P5-T96 Small-VPS Runtime And Export Proof

**Date:** 2026-05-10  
**Status:** Complete; ready for review  
**Owner:** Codex lead lane with backend/export-worker, frontend initial-load, and deployment-runtime subagent lanes

## Scope

Optimize the full production stack for 1-2 GB RAM VPS hosts without removing the default `backend`, `frontend`, `public-site`, `worker`, `redis`, and Postgres/Caddy deployment shape.

Planned changes:

- Add runtime database pool knobs and small-VPS production env guidance.
- Add worker scheduler startup pacing so enabled schedulers do not all tick immediately at boot.
- Move queued report exports out of API request time and into a worker-owned scheduler.
- Add worker queue indexes for pending and failed report export scans so scheduler polling does not repeatedly parse retry metadata across completed jobs.
- Force API/public-site roles to keep the report-export scheduler disabled while the worker role owns the enabled flag.
- Keep failed export retries bounded with scheduler-level retry limit and delay knobs stored in existing job metadata.
- Keep Plausible and ELK as explicit optional overlays.
- Tighten frontend initial-load proof by checking eager `modulepreload` JS in addition to the startup bundle.

## Validation Log

Passed:

- `cd backend && npm exec -- jest --runTestsByPath src/__tests__/config/database.test.ts src/__tests__/services/intervalBatchRunner.test.ts src/__tests__/services/reportExportJobSchedulerService.test.ts src/__tests__/services/reportExportJobService.test.ts src/__tests__/workerSchedulerRegistry.test.ts src/__tests__/worker.test.ts src/modules/reports/controllers/__tests__/report.handlers.test.ts --forceExit`
  - Result: 7 suites passed, 42 tests passed.
- `cd backend && npm run type-check`
- `cd backend && npm run lint`
- `cd frontend && npm run build`
- `node scripts/check-frontend-bundle-size.js`
  - Result: startup bundle `118261` raw bytes under cap `122880`; total initial JS `726428` raw bytes under cap `750000`.
- `cd frontend && npm run type-check`
- `node --check scripts/check-frontend-bundle-size.js`
- `make check-links`
  - Result: checked 219 files and 1413 local links; no broken active-doc links found.
- `RUNTIME_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.yml config -q`
  - Result: Compose rendered successfully; API and public-site roles force `REPORT_EXPORT_JOB_SCHEDULER_ENABLED=false`, while the worker role renders `REPORT_EXPORT_JOB_SCHEDULER_ENABLED=true`.
- `env POSTGRES_DATA_DIR=/tmp/nonprofit-manager-postgres BACKUP_DIR=/tmp/nonprofit-manager-backups DB_PASSWORD=postgres REDIS_URL=redis://redis:6379 RUNTIME_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.yml -f docker-compose.db-self-hosted.yml config --services`
  - Result: rendered `postgres`, `redis`, `public-site`, `worker`, `backend`, and `frontend`.
- `git diff --check`
- `docker info`
  - Result: Docker Desktop server reachable on the `desktop-linux` context.
- `make docker-validate-overlays`
  - Result: Docker image pinning, dev/prod/overlay Compose config rendering, and Caddyfile validation passed.
- `make docker-build`
  - Result: backend and frontend production images built successfully.
- `make docker-validate`
  - Result: Dockerfile validation completed successfully.
- `make test-e2e-docker-smoke`
  - Result: isolated Docker stack reached backend/frontend/public-site readiness and 4 Docker-backed Playwright smoke tests passed.

Follow-up efficiency review validation:

- `cd backend && npm exec -- jest --runTestsByPath src/__tests__/services/intervalBatchRunner.test.ts src/__tests__/services/reportExportJobService.test.ts src/__tests__/services/reportExportJobSchedulerService.test.ts --forceExit`
  - Result: 3 suites passed, 15 tests passed.
- `make db-verify`
  - Result: migration manifest/initdb contract, isolated test database, RLS, superseded-index, and audit partition checks passed after adding `125_report_export_worker_queue_indexes.sql`.
- `git diff --check`
  - Result: passed.
