# P4-T9C Docker Baseline Capture

Date: 2026-03-04  
Branch: `codex/p4-t9c-docker-overhaul`

## Requested baseline commands

1. `docker compose -f docker-compose.dev.yml up -d`
2. `make ci-full` (while dev stack is up)
3. `docker compose ps` snapshots for dev/CI infra state

## Baseline outcomes in this environment

- `docker compose -f docker-compose.dev.yml up -d` failed:
  - `Cannot connect to the Docker daemon at unix:///Users/bryan/.docker/run/docker.sock.`
- `docker compose -f docker-compose.dev.yml ps` failed with the same daemon connectivity error.
- `make ci-full` failed immediately at test-infra startup for the same daemon connectivity issue.

## Evidence logs

- `/tmp/p4-t9c-baseline-docker-up-dev.log`
- `/tmp/p4-t9c-baseline-docker-dev-ps.log`
- `/tmp/p4-t9c-baseline-make-ci-full.log`
