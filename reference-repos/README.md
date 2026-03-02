# Reference Repositories (Local-Only Workspace)

This directory hosts the nonprofit-manager reference manifest and compatibility links. Canonical checkouts are consolidated under `/Users/bryan/projects/reference-repos`.

## Guardrails

- Refs are pinned in [`manifest.lock.json`](./manifest.lock.json).
- These checkouts are **local-only** and ignored by git history.
- AGPL sources are used for architecture study only.
- No direct copy/paste into `nonprofit-manager` runtime code.

## Sync and Verify

```bash
bash scripts/reference/sync-reference-repos.sh
bash scripts/reference/verify-reference-repos.sh
```

## Rotation

When changing source pins:

1. Update `reference-repos/manifest.lock.json` with new commit hashes and canonical destinations.
2. Re-run sync/verify scripts.
3. Update `docs/development/reference-patterns/SOURCE_SYNC_REPORT.md` with the new verification output and canonical absolute destinations.
