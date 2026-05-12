# P5-T122 CBIS Production Contact Dedupe Proof

**Date:** 2026-05-12
**Status:** Review
**Scope:** Apply the completed `P5-T121` duplicate-contact decision overlay to `cbis.westcat.ca` production data with an exact bundle dry-run, apply, backup anchor, and operator-only contact merge pass. No public API, schema migration, support-data edit, or frontend runtime change is part of this row.

## Bundle Identity

- Bundle: `/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T205918Z`
- Fingerprint: `sha256:ed4eaa4444711fc6db9244909e6a2c767b1521f1061037a83a94ee14d0272961`
- Schema bundle: `2026-05-12.generated-from-schemaRegistry-through-129_cbis_import_duplicate_guards`
- Decision audit: `/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T205918Z/cbis_duplicate_contact_decision_audit.csv`

## Implementation

- Added `backend/src/scripts/cbisMergeDuplicateContacts.ts` as an operator-only CLI compiled to `dist/scripts/cbisMergeDuplicateContacts.js`.
- The CLI requires the decision audit, organization id, actor id, expected bundle fingerprint, expected schema version, and `dry-run` or `apply` mode.
- The CLI validates:
  - strict decision-audit shape and accepted decisions,
  - exact successful production import apply run,
  - contact provenance for the exact fingerprint/schema,
  - active anchor contacts,
  - active keep-held contacts,
  - active held contacts to merge or already-inactive held contacts to skip idempotently.
- Apply mode calls the existing `ContactMergeService` with anchor-preferred scalar conflict resolutions and then verifies merged held contacts are inactive.
- The CBIS import CLI accepts `--duplicate-contact-decision-audit` so the dry-run/apply safety plan can allow only reviewed held-contact to anchor provenance retargets from the P5-T121 decision audit; all other source-to-different-target provenance conflicts remain held.
- The merge CLI can resolve a missing generated bundle anchor to exactly one active production contact by the same conservative natural keys, then retarget held-contact provenance to the resolved live anchor after a successful merge.
- The merge CLI also supports the production-only `--merge-legacy-production-matches` option used after the exact P5-T121 decision pass. That option folds active null-account, no-provenance production duplicates into the single resolved anchor for the accepted duplicate-name key. It excludes keep-held names and fails if a name resolves to more than one anchor.

## Local Validation

Passed:

```bash
cd backend && npm test -- --runTestsByPath src/__tests__/scripts/cbisMergeDuplicateContacts.test.ts --runInBand
cd backend && npm test -- --runTestsByPath src/modules/cbisImport/__tests__/cbisImportService.test.ts src/__tests__/scripts/cbisMergeDuplicateContacts.test.ts --runInBand
cd backend && npm run type-check
cd backend && npm run lint
cd backend && npm test -- --runTestsByPath src/__tests__/integration/contacts.test.ts --runInBand --testNamePattern="POST /api/v2/contacts/:id/merge"
cd backend && npm run build
/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/maintain-cbis-data-tools/scripts/validate_prepared_bundle.py --source-dir "/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T205918Z"
cd /Users/bryan/projects/nonprofit-manager && git diff --check
cd "/Users/bryan/Desktop/CBIS Data" && git diff --check
```

Additional same-name production merge regression:

```bash
cd backend && npm test -- --runTestsByPath src/__tests__/scripts/cbisMergeDuplicateContacts.test.ts --runInBand
cd backend && npm run type-check
cd backend && npm run lint
cd backend && npm run build
cd /Users/bryan/projects/nonprofit-manager && git diff --check
```

Prepared-bundle validation result:

```text
errors: []
warnings: []
contacts: ready 1293, review_required 73
mapping_row_count: 37106
gap_row_count: 103
```

## Production Proof

Passed.

### Preflight And Deploy

- `https://cbis.westcat.ca/health`: `200` / `{"status":"ok"}` before and after production writes.
- DNS/host grounding: `cbis.westcat.ca` and `wcs.pw` resolved to `159.198.74.129`; SSH hostname returned `wcs.pw`.
- Containers after final deploy/write proof: backend, frontend, postgres, public-site, and redis healthy; worker running.
- Production migration guard: `129_cbis_import_duplicate_guards.sql` was applied before import.
- App tree deployed from committed code to `/srv/nonprofit-manager` using `git archive HEAD | ssh ... tar -xf - -C /srv/nonprofit-manager`, then the existing four-file production compose stack was rebuilt.

### Bundle And Backups

- Remote staged bundle: `/srv/nonprofit-manager-production/import-bundles/normalized_candidate_bundle_20260512T205918Z`
- Remote loader verified:

```json
{
  "fingerprint": "sha256:ed4eaa4444711fc6db9244909e6a2c767b1521f1061037a83a94ee14d0272961",
  "schema": "2026-05-12.generated-from-schemaRegistry-through-129_cbis_import_duplicate_guards",
  "contacts": 1366,
  "mappingRows": 37106,
  "gapRows": 103
}
```

- Pre-import backup: `/srv/nonprofit-manager-production/backups/p5-t122-preimport-20260512T213733Z.dump`
  - SHA256: `cc016d6aff3b62048b64af3844e55e723d6e789859d4020e855a63caaf8ffac4`
  - Size: `19M`
- Pre-legacy-same-name backup: `/srv/nonprofit-manager-production/backups/p5-t122-pre-legacy-samename-20260512T221331Z.dump`
  - SHA256: `57bb1291b4ac9594a563dbb0da4787da630fd8960823be5b03f28fc148294f6d`
  - Size: `32M`

### Import

- Initial production dry-run `96abea51-a68a-4aa2-ad8a-751a67849688` succeeded but correctly stopped the gate because the reviewed held-contact retargets surfaced as `194` provenance conflicts before the decision audit was wired into the importer.
- Corrected production dry-run `edf94c56-7487-49f0-8e14-75889cff7cf0` succeeded with the exact fingerprint/schema and `provenance_conflicts: 0`.
- Production apply `6790b461-b01b-409c-959e-4b0a95a16168` succeeded with:
  - mode/status: `apply` / `succeeded`
  - rollback artifact: `/srv/nonprofit-manager-production/backups/p5-t122-preimport-20260512T213733Z.dump`
  - contacts counter: `ready_count=1293`, `review_required_count=714`, `imported_count=652`, `failed_count=0`
  - current contact provenance for exact fingerprint/schema: `969`

### Merge

- First merge dry-run stopped without writes when generated bundle anchor ids were absent from production for natural-key duplicate rows. The CLI was tightened to resolve those anchors to a single active production contact by conservative identity keys.
- Exact P5-T121 merge dry-run after the fix:
  - decisions: `196`
  - `merge_to_anchor`: `194`
  - `keep_held`: `2`
  - unique merge anchors: `120`
  - active merge candidates: `194`
  - inactive held skips: `0`
  - resolved missing generated anchors: `174`
- Exact P5-T121 merge apply:
  - applied merges: `194`
  - provenance retargets: `173`
- Same-name legacy production pass, added after active People search still showed pre-provenance duplicates such as Cherie Knight:
  - dry-run candidates: `212`
  - applied legacy same-name merges: `212`
  - final dry-run active merge candidates: `0`
  - final dry-run inactive held skips: `194`
  - final dry-run legacy active merge candidates: `0`
  - keep-held contacts preserved: `2`

### Verification

- Final `/health`: `200` / `{"status":"ok"}`.
- Final containers: backend, frontend, postgres, public-site, and redis healthy; worker running.
- Exact apply run count for the P5-T121 fingerprint/schema: `1`.
- Keep-held samples remain active:
  - `a3aeb9e8-a48f-5c5e-bb44-cb2222de6300` / David Louie
  - `4dddcda3-ffa5-5341-a0f6-ad63e8ec1068` / Miriam Beechey
- Cherie Knight proof:
  - active survivor: `ba282bc4-ea47-4498-ab65-63c6f92a56de`, email `cherieknight@yahoo.com`, phone `250-661-4258`, birth date `1971-07-14`, `108` notes, `3` cases
  - all other Cherie Knight / Cherie `Knight / Client` rows in the checked set are inactive
- Adele Arseneau proof:
  - active survivor: `808d1d79-c0a5-4efb-b591-b72323730dee`, email `metiscaron@gmail.com`
  - previous generated and legacy same-name Adele rows are inactive
- P5-T120 continuity still present:
  - Dora Ogden contact `622e1a1b-a988-40ac-92d3-ccc10ddebaf8` has `167` linked notes after same-name merge consolidation
  - case `49f7f188-be03-4cd7-b4ce-be48aea9703c` / `CBIS-TICIPANT2709` exists and remains linked to Dora's contact
