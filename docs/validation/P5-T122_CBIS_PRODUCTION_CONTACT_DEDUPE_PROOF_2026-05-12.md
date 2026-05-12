# P5-T122 CBIS Production Contact Dedupe Proof

**Date:** 2026-05-12
**Status:** In Progress
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

## Local Validation

Passed:

```bash
cd backend && npm test -- --runTestsByPath src/__tests__/scripts/cbisMergeDuplicateContacts.test.ts --runInBand
cd backend && npm run type-check
cd backend && npm run lint
cd backend && npm test -- --runTestsByPath src/__tests__/integration/contacts.test.ts --runInBand --testNamePattern="POST /api/v2/contacts/:id/merge"
/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/maintain-cbis-data-tools/scripts/validate_prepared_bundle.py --source-dir "/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T205918Z"
cd /Users/bryan/projects/nonprofit-manager && git diff --check
cd "/Users/bryan/Desktop/CBIS Data" && git diff --check
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

Pending deploy, backup, import dry-run/apply, merge dry-run/apply, and post-run verification.
