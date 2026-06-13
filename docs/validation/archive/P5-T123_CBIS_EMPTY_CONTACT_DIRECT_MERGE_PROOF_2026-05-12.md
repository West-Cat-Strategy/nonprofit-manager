# P5-T123 CBIS Empty-Contact Direct Merge Proof

**Date:** 2026-05-12
**Status:** Review
**Scope:** Add and apply an operator-only CBIS second-pass merge path for `cbis.westcat.ca` that can merge sparse same-person contacts through the existing contact merge service, then hard-delete merged source rows only after the reference guard proves the source is unreferenced. No public API, frontend merge feature, schema migration, full MPI system, or support SQL is part of this row.

## Implementation

- Extended `backend/src/scripts/cbisMergeDuplicateContacts.ts` with:
  - `--merge-empty-same-person`
  - `--empty-contact-audit`
  - `--merge-inactive-sources`
  - `--hard-delete-merged-sources`
- The empty same-person lane fails closed unless the source is sparse, same normalized name resolves to exactly one richer active survivor, keep-held names are excluded, and account/context checks do not conflict.
- The operator hard-purge path now:
  - calls the existing `ContactMergeService` first,
  - suppresses the new merge activity source reference only for hard-purge operator runs,
  - retargets known FK and polymorphic contact references,
  - compares polymorphic IDs as text so blank non-contact values cannot poison the guard,
  - verifies no remaining references,
  - deletes the inactive source in a transaction with local operator audit context.
- Follow-up dry-runs tolerate already-deleted merge sources while still requiring keep-held contacts and resolved survivors to be active.

## Local Validation

Passed:

```bash
cd backend && npm test -- --runTestsByPath src/__tests__/scripts/cbisMergeDuplicateContacts.test.ts --runInBand
cd backend && npm test -- --runTestsByPath src/modules/cbisImport/__tests__/cbisImportService.test.ts src/__tests__/scripts/cbisMergeDuplicateContacts.test.ts --runInBand
cd backend && npm test -- --runTestsByPath src/__tests__/integration/contacts.test.ts --runInBand --testNamePattern="POST /api/v2/contacts/:id/merge"
cd backend && npm run type-check
cd backend && npm run lint -- --quiet
cd backend && npm run build
cd /Users/bryan/projects/nonprofit-manager && git diff --check
```

The first attempted parallel rerun of the CBIS import/script suites conflicted with the isolated test DB container already started by the concurrent contact-merge integration suite; rerunning the CBIS suites after that completed passed.

## Production Proof

Passed on `wcs.pw` for `cbis.westcat.ca`.

### Preflight And Deploy

- `https://cbis.westcat.ca/health`: `200` / `{"status":"ok"}` before and after the write.
- Containers after final proof:
  - backend: healthy
  - frontend: healthy
  - public-site: healthy
  - postgres: healthy
  - redis: healthy
  - worker: running
- Deployed to the existing four-file compose stack:
  - `docker-compose.yml`
  - `docker-compose.host-access.yml`
  - `docker-compose.db-self-hosted.yml`
  - `docker-compose.postgres14-root.yml`

### Bundle And Backups

- Remote staged bundle: `/srv/nonprofit-manager-production/import-bundles/normalized_candidate_bundle_20260512T205918Z`
- Fingerprint: `sha256:ed4eaa4444711fc6db9244909e6a2c767b1521f1061037a83a94ee14d0272961`
- Schema bundle: `2026-05-12.generated-from-schemaRegistry-through-129_cbis_import_duplicate_guards`
- Import apply run checked by the merge CLI: `6790b461-b01b-409c-959e-4b0a95a16168`
- Pre-apply backup:
  - Path: `/srv/nonprofit-manager-production/backups/database/p5-t123-pre-empty-contact-20260512T231217Z.dump`
  - SHA256: `266da8cc74b383bc9381011e93837a9b29c336373666090940a69f02054114a9`
  - Size: `32M`
- Retry-state backup after guard hardening and before final apply:
  - Path: `/srv/nonprofit-manager-production/backups/database/p5-t123-pre-hard-purge-retry-20260512T232718Z.dump`
  - SHA256: `d244c886e291f9c29a3ca3e64536003931429e27520bec23a6a43c58be44f753`
  - Size: `32M`

### Dry Run And Apply

- Final pre-apply dry-run:
  - decisions: `196`
  - `merge_to_anchor`: `194`
  - `keep_held`: `2`
  - active merge candidates: `0`
  - inactive held merge sources: `194`
  - deleted merge sources: `0`
  - empty same-person candidates: `0`
- Apply:
  - applied reviewed merges: `194`
  - hard-deleted sources: `194`
  - legacy applied merges: `0`
  - empty same-person applied merges: `0`
  - provenance retargets: `0`
- Final dry-run:
  - active merge candidates: `0`
  - inactive held merge sources: `0`
  - deleted merge sources: `194`
  - keep-held contacts: `2`
  - empty same-person candidates: `0`

### Redacted Audit Artifacts

- Apply audit: `/srv/nonprofit-manager-production/import-bundles/normalized_candidate_bundle_20260512T205918Z/p5-t123-empty-contact-audit-apply.csv`
- Final audit: `/srv/nonprofit-manager-production/import-bundles/normalized_candidate_bundle_20260512T205918Z/p5-t123-empty-contact-audit-final.csv`
- SHA256 for both audit files: `864441577c1d12267afa39f43eb15e02e75c5fa8a64c07665d1b355bcf06e961`
- Each audit file is one header-only row because the production empty same-person candidate count was `0` after the P5-T122 baseline; no raw contact ids or names were written.

### Final Data Checks

- Decision-audit aggregate:
  - merge source rows remaining: `0`
  - keep-held rows active: `2`
  - keep-held expected: `2`
- Dora/case continuity:
  - Dora contact exists and is active.
  - Dora linked notes remain `167`.
  - case `CBIS-TICIPANT2709` exists and remains linked to Dora's contact.
- Final `/health`: `200` / `{"status":"ok"}`.

## Notes

- The first production apply attempt exposed a hard-purge guard issue where pooled backend sessions could evaluate the delete with an empty audit context; no source rows were deleted by that failed attempt. The operator CLI was hardened to run hard purge in a dedicated transaction with local operator context before the successful apply.
- The second pass found no new active empty same-person candidates beyond the P5-T122 baseline, but it did finish the requested direct-merge behavior by hard-removing the `194` previously inactive reviewed source contacts after the merge/reference guard passed.
