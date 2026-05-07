# Deployment Guide

**Last Updated:** 2026-05-07

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
| Database | Choose exactly one DB-at-rest mode documented in [DB_SETUP.md](DB_SETUP.md) |

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

## Rollback

Rollback is environment-specific, but every production handoff should record:

- The deployed git commit and image tag/digest
- The database migration state
- Whether a migration has an explicit down/restore path
- Backup snapshot location
- Provider/webhook config changes
- The validation commands run before and after rollback

Use provider-managed backup/restore paths for managed databases. For self-hosted databases, follow the backup and restore contract in [DB_SETUP.md](DB_SETUP.md).
