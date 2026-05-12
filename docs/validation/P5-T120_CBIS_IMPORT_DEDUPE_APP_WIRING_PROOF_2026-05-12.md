# P5-T120 CBIS Import, Dedupe, And App Wiring Proof

**Date:** 2026-05-12
**Status:** In Progress
**Scope:** Mainline the operator-only CBIS staged importer, add deterministic duplicate-name holdouts in CBIS import prep, fix contact Notes count/timeline consistency for imported null-account contacts, and prove the path against the local CBIS clone only.

## Summary

- Added `P5-T120` as the live tracked row and kept production out of scope.
- Mainlined the CBIS importer CLI and ledger/provenance migrations from the sibling import branch onto current `main`.
- Preserved migration order around `126`, `127`, `128`, and `129`; `make db-verify` passed.
- Refactored the oversized importer service into smaller bundle, duplicate-safety, writer, run-store, dependency, row utility, and type modules.
- Updated CBIS import prep to hold weak name-only duplicate contact rows for review when a stronger same-name anchor exists.
- Moved remaining actionable invalid/gap queues into dedicated review artifacts so the generic gap report only carries intentional system-reference exclusions.
- Fixed the contact Notes count/timeline mismatch for imported contacts with null `account_id`.
- Proved a local-clone dry-run against `normalized_candidate_bundle_20260512T184418Z`; live app row counts did not change and production was untouched.

## Production Follow-Up

- The approved P5-T120 app code was deployed to `cbis.westcat.ca` on 2026-05-12.
- Post-deploy proof confirmed Dora Ogden's imported contact Notes rendered with `NOTES(147)`.
- The same production proof exposed a remaining app-wiring gap: note-linked case `49f7f188-be03-4cd7-b4ce-be48aea9703c` / `CBIS-TICIPANT2709` returned "Case not found".
- Continue the same P5-T120 row by fixing backend imported null-account case visibility. Do not run a production import, production dry-run, support SQL, or schema migration for this follow-up.

## Imported Case Visibility Fix

- Added one shared backend case organization-scope predicate that preserves normal `COALESCE(c.account_id, con.account_id)` ownership and admits CBIS-imported null-account case/contact pairs only when `cbis_import_target_provenance` scopes either the case or linked contact to the active organization.
- Reused that predicate for case list/detail lookup, shared case ownership checks, and case-note lookup scoping.
- Added backend integration coverage for CBIS-proven null-account case detail, contact-filtered list de-duplication, timeline and notes access, cross-org 404 behavior, and null-account cases without CBIS provenance staying hidden.
- Added frontend regressions proving real UUID case links stay inside the correct contact note card and imported `account_id: null` cases render the normal case detail view.
- This follow-up adds no migration, production import, production dry-run, or support SQL.

## Data Prep Evidence

Baseline bundle:

- `/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T111412Z`

New candidate bundle:

- `/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T184418Z`

Material count changes:

- Contacts `ready`: `1491 -> 1293`
- Contacts `review_required`: `0 -> 267` (`198` duplicate-name holdouts plus `69` name-review rows)
- Contacts `invalid`: `69 -> 0`
- Activities: `12 invalid -> 12 review_required`, `5809 ready`
- Volunteer hours: `1 invalid -> 1 review_required`, `251 ready`
- Identity review decisions unchanged: `36 auto_merged`, `129 skipped`
- Cluster count unchanged: `4332`
- `cbis_duplicate_contact_name_review.csv`: `597` rows
- `cbis_contact_name_review.csv`: `69` rows
- `cbis_activity_date_review.csv`: `12` rows
- `cbis_volunteer_hours_review.csv`: `1` row
- `cbis_class_attendance_review.csv`: `399` rows
- Gap report rows: `584 -> 103`, now limited to the intentional system-reference exclusions

The new holdout is conservative: name-only `client_lead`, `client_activity`, and `contact_activity` clusters are held for review when the same first/last name has a stronger `participant`, `client`, or `contact` anchor. Missing-surname contacts, missing-date activities, missing-hour volunteer rows, and unresolved class attendance titles are review-only until a human resolves them. The `103` system-reference exclusions and high-risk identity review rows remain manual.

## Local Clone Dry-Run

Bundle:

- `/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T184418Z`

Run:

- `409d8566-075f-47b6-9949-8e8eaf30fa6b`
- mode: `dry-run`
- status: `succeeded`
- fingerprint: `sha256:7c378bf2146ae76af1c1d00dc7e66c80fcdfe9c3502c728c77eff9cbeac6b957`
- schema bundle: `2026-05-12.generated-from-schemaRegistry-through-129_cbis_import_duplicate_guards`

Reconciliation:

- ready rows: `17026`
- imported rows during rolled-back dry-run: `4750`
- held-out rows: `12556`
- mapping rows: `37106`
- gap rows: `103`
- issue count: `12659`
- duplicate conflicts: `12276`
- held for review: `12276`
- provenance conflicts: `0`

Local clone counts stayed stable:

- contacts: `2386 -> 2386`
- cases: `904 -> 904`
- events: `690 -> 690`
- target provenance rows: `10366 -> 10366`
- CBIS import runs: `7 -> 8` because dry-run audit metadata was persisted

Top dry-run issue reasons:

- `dependent_row_held`: `11629`
- `duplicate_conflict`: `647`
- `review_required`: `280`
- `no_authoritative_mapping:system_reference`: `103`

Source-row statuses for the run:

- `ready`: `9858`
- `review_required`: `281`
- `skipped`: `119`

## Browser Proof

Local frontend: `http://127.0.0.1:8005`

Evidence:

- Contact: Dora Ogden, `622e1a1b-a988-40ac-92d3-ccc10ddebaf8`
- Notes tab rendered as `Notes(147)`
- Notes timeline rendered `147` note cards
- Empty timeline text was not visible
- People search page showed the duplicate-name explanation and included Dora Ogden

Screenshots:

- `/Users/bryan/projects/nonprofit-manager/tmp/p5-t120-browser-proof/dora-notes.png`
- `/Users/bryan/projects/nonprofit-manager/tmp/p5-t120-browser-proof/people-search-dora.png`

## Validation Commands

Passed:

- `npm --workspace backend run type-check`
- `npm --workspace frontend run type-check`
- `npm --workspace backend exec eslint -- src/modules/cbisImport src/scripts/cbisImport.ts src/modules/contacts src/__tests__/services/contactService.test.ts src/__tests__/integration/contacts.test.ts`
- `npm --workspace backend test -- --runTestsByPath src/modules/cbisImport/__tests__/cbisImportBundle.test.ts src/modules/cbisImport/__tests__/cbisImportService.test.ts --runInBand`
- `npm --workspace backend test -- --runTestsByPath src/__tests__/services/contactService.test.ts --runInBand`
- `npm --workspace backend test -- --runTestsByPath src/__tests__/integration/contacts.test.ts --runInBand`
- `npm --workspace frontend test -- --run src/features/contacts/pages/__tests__/ContactListPage.test.tsx src/features/contacts/pages/__tests__/ContactDetailPage.test.tsx src/features/contacts/components/__tests__/ContactNotesPanel.test.tsx`
- `npm --workspace backend run build`
- `node scripts/check-migration-manifest-policy.ts`
- `make db-verify`
- `/opt/homebrew/bin/python3.14 -m unittest test_build_unified_dataset.py test_build_normalized_candidate_bundle.py test_build_nonprofit_manager_import_bundle.py`
- `/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/maintain-cbis-data-tools/scripts/validate_prepared_bundle.py --source-dir /Users/bryan/Desktop/CBIS\ Data/normalized_candidate_bundle_20260512T184418Z`
- `/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/maintain-cbis-data-tools/scripts/sync_cbis_skill_resources.py --apply`
- `/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/maintain-cbis-data-tools/scripts/sync_cbis_skill_resources.py --check`
- `/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/bryan/.codex/skills/analyze-cbis-apricot-data`
- `/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/bryan/.codex/skills/prepare-cbis-normalized-import-bundle`
- `/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/bryan/.codex/skills/maintain-cbis-data-tools`

Notes:

- The first two backend focused-test attempts were invalid because multiple suites were launched in parallel against the single isolated test DB container; rerunning them sequentially passed.
- The first local-clone CLI attempt used Docker-internal `DB_HOST=postgres` from `.env.cbis-local` and failed before reaching the DB. The successful dry-run used host overrides to `127.0.0.1:8002`.
- Production was not queried or mutated in this implementation slice.
