# P5-T130 WCS Production Deploy Contract Proof

**Date:** 2026-05-15
**Worker:** P5-T130
**Scope:** WCS deployment contract lane only

## Scope

Added an opt-in PostgreSQL 14/root-layout compatibility overlay plus deploy wrapper support for extra Compose files.

Changed files:

- `docker-compose.postgres14-root.yml`
- `scripts/deploy.sh`
- `scripts/docker-validate-overlays.sh`
- `scripts/tests/tooling-contracts.test.cjs`
- `docs/deployment/DEPLOYMENT.md`
- `docs/deployment/DB_SETUP.md`
- `scripts/README.md`
- `docs/validation/P5-T130_WCS_PRODUCTION_DEPLOY_CONTRACT_PROOF_2026-05-15.md`

Lead-owned docs intentionally not edited:

- `docs/phases/planning-and-progress.md`
- `docs/validation/README.md`

## Contract Notes

- `docker-compose.postgres14-root.yml` only overrides the `postgres` service image to digest-pinned PostgreSQL 14 and sets `PGDATA=/var/lib/postgresql`.
- The overlay does not define or change volumes, ports, credentials, app services, or production data paths.
- `DEPLOY_EXTRA_COMPOSE_FILES` accepts comma-separated extra Compose files, resolves relative paths from the project root, appends them after DB-at-rest overlays, and fails closed on missing files.
- `scripts/docker-validate-overlays.sh` validates the `base + host-access + self_hosted + postgres14-root` Compose contract.

## Targeted Proof

Passed:

```bash
make test-tooling
DEPLOY_EXECUTE=0 DEPLOY_PRODUCTION_ENV_FILE=.env.production.example DB_AT_REST_ENCRYPTION_MODE=self_hosted DB_HOST=postgres POSTGRES_DATA_DIR=/tmp/nonprofit-manager-postgres BACKUP_DIR=/tmp/nonprofit-manager-backups SELF_HOSTED_DB_RISK_ACCEPTED=true DB_PASSWORD=postgres REDIS_URL=redis://redis:6379 DEPLOY_USE_HOST_CADDY=1 DEPLOY_EXTRA_COMPOSE_FILES=docker-compose.postgres14-root.yml ./scripts/deploy.sh production
```

Result: 47/47 tooling-contract tests passed, including the deploy dry-run inclusion and missing-extra-overlay failure tests. The direct deploy dry-run printed the expected Compose file order: base, host-access, self-hosted DB, then `docker-compose.postgres14-root.yml`.

Partial:

```bash
make docker-validate-overlays
```

Result: image policy passed and Compose config validation reached and completed the new `base + host-access + self_hosted + postgres14-root` overlay check. The command then failed at the existing Caddyfile validation step because the local Docker daemon socket was unavailable:

```text
failed to connect to the docker API at unix:///Users/bryan/.docker/run/docker.sock
```

Additional spot check:

```bash
DB_PASSWORD=postgres REDIS_URL=redis://redis:6379 RUNTIME_ENV_FILE=.env.production.example NODE_ENV=production DB_AT_REST_ENCRYPTION_MODE=self_hosted DB_AT_REST_PROVIDER=self_hosted DB_AT_REST_VERIFIED=true DB_LUKS_MAPPING_NAME=nonprofit-manager POSTGRES_DATA_DIR=/tmp/nonprofit-manager-postgres BACKUP_DIR=/tmp/nonprofit-manager-backups docker compose --env-file .env.production.example -p nonprofit-prod -f docker-compose.yml -f docker-compose.host-access.yml -f docker-compose.db-self-hosted.yml -f docker-compose.postgres14-root.yml config postgres
```

Result: rendered `postgres` with the existing self-hosted volume/port/user/initdb wiring plus `image: postgres:14-alpine@sha256:d9eb2493ac345dc97c593c960453bcb131db4bc7d6160c5b2e699ef5692ec402` and `PGDATA: /var/lib/postgresql`.
