# CBIS Production Deployment

This runbook covers the live `cbis.westcat.ca` deployment on `cbis-vps`.

## Runtime Contract

- Public origin: `https://cbis.westcat.ca`
- SSH target: `cbis-vps`
- Live app directory: `/srv/nonprofit-manager`
- Runtime manager: `nonprofit-manager.service`
- Compose project: `nonprofit-manager`
- Compose files: `docker-compose.yml` + `docker-compose.vps.yml` + `docker-compose.db-encrypted.yml`
- Public ingress: Docker Caddy from `Caddyfile.vps`
- Local canonical env file: `~/.secrets/nonprofit-manager-cbis.env`
- Local sudo credential file: `~/.secrets/cbis-vps-159.198.70.25.env`
- Required DB-at-rest env contract: `DB_AT_REST_ENCRYPTION_MODE=luks`, `POSTGRES_DATA_DIR`, `DB_LUKS_MAPPING_NAME`, `BACKUP_DIR`

The CBIS VPS is a promoted snapshot deployment, not a remote git checkout. Do not use `scripts/deploy.sh production` for this host.

## Deploy

Deploy a committed ref from the current repository:

```bash
./scripts/deploy-cbis.sh --ref origin/main
```

The deploy script:

1. Creates a clean `git archive` snapshot for the selected ref.
2. Syncs that snapshot and the canonical production env file to a remote staging directory.
3. Promotes the snapshot into `/srv/nonprofit-manager` with `sudo rsync --delete`.
4. Verifies the LUKS mapper is active and that both `POSTGRES_DATA_DIR` and `BACKUP_DIR` resolve onto `/dev/mapper/$DB_LUKS_MAPPING_NAME`.
5. Reloads `nonprofit-manager.service`, runs `docker compose` with the encrypted DB overlay, and applies `./scripts/db-migrate.sh`.
6. Runs the full read-only verification sequence.

## Verify

Run the verification suite independently at any time:

```bash
./scripts/verify-cbis.sh
```

This checks:

- `nonprofit-manager.service` state,
- compose container status,
- `cryptsetup status $DB_LUKS_MAPPING_NAME`,
- `POSTGRES_DATA_DIR` mount source and `BACKUP_DIR` mount source,
- PostgreSQL container bind-mount use of `POSTGRES_DATA_DIR`,
- internal backend/frontend health,
- migration status via `./scripts/db-migrate.sh --status`,
- public HTTPS and health endpoints.

## Rollback

Redeploy the last known good git ref:

```bash
./scripts/deploy-cbis.sh --ref <previous-commit-sha>
```

Because the runtime is ref-based, rollback is performed by redeploying a previous commit rather than checking out code on the VPS.
