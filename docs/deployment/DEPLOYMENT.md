# Deployment Guide

**Last Updated:** 2026-05-10

This guide summarizes the production deployment contract for Nonprofit Manager. Use [README.md](README.md) for the deployment section index, [DB_SETUP.md](DB_SETUP.md) for database details, [publishing-deployment.md](publishing-deployment.md) for public-site deployment notes, and [../testing/TESTING.md](../testing/TESTING.md) for validation gates.

## Deployment Model

The repo supports Docker-based production packaging plus manual/runtime-specific operations where needed.

| Concern | Current Contract |
|---|---|
| App image validation | `make docker-build`, `make docker-validate`, `make docker-validate-overlays` |
| Release proof without deploy | `make release-check` |
| Staging/prod wrapper | `make release-staging` or `make release-production`; actual deploy still requires `DEPLOY_EXECUTE=1` |
| Public app origin | Serve frontend and backend from one HTTPS origin; route `/api`, `/api/v2/*`, and `/health` to backend |
| Public-site runtime | Use the public-site container/host contract in [publishing-deployment.md](publishing-deployment.md) |
| Worker runtime | Run the `worker` container with no HTTP ingress; enable scheduler flags only on the single intended scheduler runner |
| Database | Choose exactly one DB-at-rest mode documented in [DB_SETUP.md](DB_SETUP.md) |

## Small VPS Runtime Guidance

The default production deployment remains the full stack: `backend`, `frontend`, `public-site`, `worker`, Redis, Postgres or managed Postgres, and the selected ingress layer. Do not remove services from Compose to fit a 1-2 GB VPS; instead, cap per-process work and leave optional overlays off until the host has capacity.

Recommended small-host env posture:

| Process or area | Recommendation |
|---|---|
| Backend API DB pool | Set `BACKEND_DB_POOL_MAX_CONNECTIONS=6`; Compose maps it to `DB_POOL_MAX_CONNECTIONS` inside the API process. |
| Public-site DB pool | Set `PUBLIC_SITE_DB_POOL_MAX_CONNECTIONS=3`; Compose maps it to `DB_POOL_MAX_CONNECTIONS` inside the public-site process. |
| Worker DB pool | Set `WORKER_DB_POOL_MAX_CONNECTIONS=2`; Compose maps it to `DB_POOL_MAX_CONNECTIONS` inside the worker process. |
| DB pool timeouts | Keep `DB_POOL_IDLE_TIMEOUT_MS=30000` and `DB_POOL_CONNECTION_TIMEOUT_MS=2000` unless the database provider requires different timing. |
| Report export startup | Keep `REPORT_EXPORT_JOB_SCHEDULER_STARTUP_JITTER_MS=15000` or another small jitter so queued export processing does not compete with API/public-site warmup at worker boot. |
| Report export jobs | Keep `REPORT_EXPORT_JOB_SCHEDULER_ENABLED=true` on the single production worker that owns queued exports; Compose forces the API and public-site roles off even when the shared env file enables the worker. Start with `REPORT_EXPORT_JOB_SCHEDULER_BATCH_SIZE=2` and `REPORT_EXPORT_JOB_SCHEDULER_FAILED_RETRY_LIMIT=1`. |
| Request logging | Keep `REQUEST_LOGGING_ENABLED=false` unless actively debugging noisy request paths. |
| Worker batches | Prefer small batches on 1-2 GB hosts: reminders `10`, local campaign delivery `5`, public snapshot cleanup `10`, social sync `10`, webhook retries `25`. |

Keep the aggregate database connection budget below the Postgres `max_connections` value after reserving room for migrations, backups, admin shells, and monitoring. When using Docker Compose, tune the `BACKEND_DB_POOL_MAX_CONNECTIONS`, `PUBLIC_SITE_DB_POOL_MAX_CONNECTIONS`, and `WORKER_DB_POOL_MAX_CONNECTIONS` values so each Node process sees its own `DB_POOL_MAX_CONNECTIONS` value.

## Prerequisites

- Docker and Docker Compose for image/compose deployment paths
- Node.js `20.19+` and npm `10+` for manual build or script execution
- PostgreSQL 18+ for repo-owned self-hosted database paths
- SSH access to the target host
- A production domain and HTTPS termination plan
- Local-only env files copied from tracked `*.example` templates

## Environment Files

Copy and fill the relevant template locally:

```bash
cp .env.production.example .env.production
```

The copied `.env.production` file stays ignored. Do not commit live secrets, deploy overrides, provider credentials, TLS material, or host-specific paths.

Minimum production decisions:

- `NODE_ENV=production`
- Public origin and CORS/WebAuthn origins
- `JWT_SECRET` and other production secrets with non-placeholder values
- Database host and DB-at-rest mode
- Per-process database pool caps for API, public-site, and worker runtimes
- Worker identity with `WORKER_INSTANCE_ID` when enabling schedulers
- Report-export scheduler startup jitter and conservative worker batch sizes on small hosts
- `REPORT_EXPORT_JOB_SCHEDULER_*` flags for the single worker that owns queued manual report exports
- Other scheduler enable flags left `false` unless exactly one worker owns that scheduler
- Backup location and retention policy
- Optional provider credentials, only for providers intentionally enabled

## HTTPS And Ingress

Production must be served over HTTPS. Put TLS termination at Caddy, nginx, a cloud load balancer, Cloudflare, or an equivalent reverse proxy.

Required ingress behavior:

- Redirect HTTP to HTTPS.
- Route `/api`, `/api/v2/*`, and `/health` to the backend.
- Route staff-app browser paths to the frontend.
- Keep internal backend/frontend host ports private unless explicitly needed for host-local diagnostics.
- Set HSTS after the domain and certificate path are stable.

## Docker Deployment

Validate before handoff:

```bash
make docker-build
make docker-validate
make docker-validate-overlays
make release-check
```

Deploy wrapper behavior:

```bash
make release-staging
make release-production
```

Both release targets run the local release gate before delegating to `scripts/deploy.sh`. They remain dry-run handoffs unless `DEPLOY_EXECUTE=1` is set in the calling environment.

The production Compose stack mounts the same `/app/uploads` volume into `backend`, `public-site`, and `worker` so files and worker-created report artifacts stay visible across the runtime processes.

Optional production overlays can be added to the dry-run or execute path with `DEPLOY_EXTRA_COMPOSE_FILES`, a comma-separated list resolved relative to the project root. The deploy wrapper appends these files after the selected DB-at-rest overlay and fails before running Compose if any file is missing.

```bash
DEPLOY_EXTRA_COMPOSE_FILES=docker-compose.postgres14-root.yml make release-production
```

`docker-compose.postgres14-root.yml` is a compatibility-only overlay for an existing self-hosted PostgreSQL 14 data directory stored at the mount root layout. It only changes the `postgres` service image to a digest-pinned PostgreSQL 14 image and sets `PGDATA=/var/lib/postgresql`; it does not change volumes, ports, credentials, app services, or production data paths. Use it only for hosts that have not yet completed the PostgreSQL 18 migration/export-restore path in [DB_SETUP.md](DB_SETUP.md).

## Database Migration

Use repo-owned migration commands instead of running individual migration files by hand.

| Need | Command |
|---|---|
| Apply migrations to the active DB | `make db-migrate` |
| Verify manifest/initdb/test DB contract | `make db-verify` |

Operational rules:

- Keep `database/migrations/manifest.tsv` and `database/initdb/000_init.sql` aligned.
- Do not replay individual migration files directly in production.
- Use [DB_SETUP.md](DB_SETUP.md) for DB-at-rest modes, managed vs self-hosted Postgres, backup paths, and restore notes.

## Local CI Runner (No GitHub Actions)

CI/CD is local-only. GitHub hosts repository metadata and pull requests, but CI, security, Docker validation, SBOM generation, and deploy gating run from this checkout.

Use:

```bash
make ci-full
make security-scan
make docker-validate
make release-check
```

See [../testing/TESTING.md](../testing/TESTING.md) for the full validation map and current review-lane caveats.

## Monitoring And Operations

- Security monitoring: [../security/SECURITY_MONITORING_GUIDE.md](../security/SECURITY_MONITORING_GUIDE.md)
- Incident response: [../security/INCIDENT_RESPONSE_RUNBOOK.md](../security/INCIDENT_RESPONSE_RUNBOOK.md)
- Log aggregation: [LOG_AGGREGATION_SETUP.md](LOG_AGGREGATION_SETUP.md)
- Plausible analytics: [PLAUSIBLE_SETUP.md](PLAUSIBLE_SETUP.md)
- Deployment proof and Docker proof notes: [../validation/README.md](../validation/README.md)

Plausible CE and OpenSearch/OpenSearch Dashboards are the preferred optional self-hosted overlays, not base-stack requirements. ELK remains a legacy transition overlay for existing deployments only. On 1-2 GB VPS hosts, keep Plausible, OpenSearch, and legacy ELK Compose overlays disabled unless they run on separate infrastructure or the host has been resized and revalidated with the overlays included.

## Rollback

Rollback is environment-specific, but every production handoff should record:

- The deployed git commit and image tag/digest
- The database migration state
- Whether a migration has an explicit down/restore path
- Backup snapshot location
- Provider/webhook config changes
- The validation commands run before and after rollback

Use provider-managed backup/restore paths for managed databases. For self-hosted databases, follow the backup and restore contract in [DB_SETUP.md](DB_SETUP.md).
