# P5-T42A Public Action Count Display Proof

**Date:** 2026-05-03

## Scope

`P5-T42A` closes the narrow public count-display follow-through from `P5-T42`.
The implementation shows current petition signature counts on existing public website petition action blocks by reusing stored public-action submission counts.

Implemented scope:

- Added an internal public-action service read for published site actions with current `submissionCount` values.
- Threaded published action summaries into the public site runtime context.
- Rendered a small public signature count for petition action blocks when `showSignatureCount` is not `false` and the block matches a published `petition_signature` action.
- Preserved the existing public action submission endpoint used by public action blocks.

Out of scope:

- Database migrations, new or changed public API routes, public-action submission request/response changes, staff action API contract changes, builder contract changes, event waitlist/check-in dashboards, broader workflow tooling, and generic public analytics surfaces.

## Interface Summary

No public API, database, migration, initdb, manifest, or shared builder contract changed.

The only new data path is internal runtime read access from the public site renderer to existing published action summaries and their `submissionCount` values.

## Validation

Passed:

```bash
cd backend && npm test -- publicActionService.test.ts publicSiteRenderer.test.ts publicSiteRuntimeService.test.ts --runInBand
cd backend && npm run type-check
make check-links
git diff --check
```

Known validation notes:

- The backend Jest command emitted the existing `--localstorage-file` warning and Jest open-handle force-exit notice; all targeted suites passed.
- `make db-verify` was not run because this row does not change migrations, `database/initdb/000_init.sql`, or `database/migrations/manifest.tsv`.
