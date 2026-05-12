# P5-T121 CBIS Duplicate-Contact Decision Overlay Proof

**Date:** 2026-05-12
**Status:** Review
**Scope:** Local CBIS data-decision dedupe only. No production import, production dry-run, production read, support SQL, schema migration, app merge action, runtime app change, or deployment.

## Summary

- Opened `P5-T121` as a new tracked row while leaving `P5-T120` in Review.
- Corrected live board counts before CBIS script edits, then recorded the coordinated subagent exception.
- Restricted the pass to single-anchor duplicate-name contact holdouts from `/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T184418Z/cbis_duplicate_contact_name_review.csv`.
- Wrote the reconciled decision CSV at `/Users/bryan/Desktop/CBIS Data/review_decisions/cbis_duplicate_contact_decisions.csv`.
- Generated the proof bundle at `/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T205918Z`.

## Subagent Classification

Read-only subagents split 121 sorted candidate duplicate-name groups into thirds and returned decision evidence only.

| Lane | Groups | Held rows | `merge_to_anchor` | `keep_held` |
|---|---:|---:|---:|---:|
| A | 41 | 72 | 71 | 1 |
| B | 41 | 67 | 67 | 0 |
| C | 39 | 57 | 56 | 1 |
| Reconciled | 121 | 196 | 194 | 2 |

The two `keep_held` rows remain held for manual review:

- `cluster:694d3ba19c5f` - middle-name evidence suggested a separate identity.
- `cluster:c25bba3c4b31` - extra ready/staff context and weak anchor identifiers.

## Implementation

- Added `--duplicate-contact-decisions <path>` to the local normalized candidate bundle CLI.
- Added a strict decision CSV interface with columns:
  `duplicate_name_key`, `held_cluster_id`, `held_contact_id`, `anchor_cluster_id`, `anchor_contact_id`, `decision`, `reviewer`, `evidence_summary`.
- Valid decisions are only `merge_to_anchor` and `keep_held`.
- Invalid, missing, conflicting duplicate, unknown-cluster, mismatched-contact, non-held, non-anchor, and multi-anchor decisions fail loudly before bundle output.
- Accepted `merge_to_anchor` decisions:
  - suppress the held contact row,
  - merge held `_source_refs` into the anchor contact mapping,
  - remap the held cluster id to the anchor `contact_id` before dependent entities are generated,
  - emit `cbis_duplicate_contact_decision_audit.csv`.
- Preserved raw source-ref keys during merge so source tables such as `Full Intake ` do not create false unmapped gap rows.
- Synced updated CBIS scripts into the maintained skill resources after implementation.

## Bundle Comparison

Baseline: `/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T184418Z`

New: `/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T205918Z`

| Metric | Baseline | New | Delta |
|---|---:|---:|---:|
| Contact rows | 1560 | 1366 | -194 |
| Contacts `ready` | 1293 | 1293 | 0 |
| Contacts `review_required` | 267 | 73 | -194 |
| Duplicate contact review rows | 597 | 285 | -312 |
| Decision audit rows | 0 | 196 | +196 |
| Entity mapping rows | 37106 | 37106 | 0 |
| Gap rows | 103 | 103 | 0 |
| Total ready rows | 17026 | 17026 | 0 |
| Total review-required rows | 280 | 86 | -194 |

Dependent held-cluster redirect proof:

| Entity | Baseline held contact refs | New held contact refs | New anchor redirects |
|---|---:|---:|---:|
| Activities | 916 | 0 | 916 |
| Event registrations | 763 | 0 | 763 |
| Cases | 0 | 0 | 0 |
| Volunteers | 0 | 0 | 0 |
| Volunteer hours | 0 | 0 | 0 |
| Follow-ups | 0 | 0 | 0 |

Additional checks:

- Baseline merged held contact rows still emitted: `194`.
- New merged held contact rows still emitted: `0`.
- New contact mapping redirects from held clusters to anchors: `194` across `194` held clusters.
- Gap delta against baseline: `0` added, `0` removed.

## Validation

Passed:

```bash
/opt/homebrew/bin/python3.14 -m py_compile build_nonprofit_manager_import_bundle.py build_normalized_candidate_bundle.py
/opt/homebrew/bin/python3.14 -m unittest test_build_unified_dataset.py test_build_normalized_candidate_bundle.py test_build_nonprofit_manager_import_bundle.py
/opt/homebrew/bin/python3.14 build_normalized_candidate_bundle.py --source-dir "/Users/bryan/Desktop/CBIS Data" --output-dir "/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T205918Z" --baseline-candidate-dir "/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T184418Z" --duplicate-contact-decisions "/Users/bryan/Desktop/CBIS Data/review_decisions/cbis_duplicate_contact_decisions.csv"
/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/maintain-cbis-data-tools/scripts/validate_prepared_bundle.py --source-dir "/Users/bryan/Desktop/CBIS Data/normalized_candidate_bundle_20260512T205918Z"
cd /Users/bryan/.codex/skills/maintain-cbis-data-tools && /opt/homebrew/bin/python3.14 scripts/sync_cbis_skill_resources.py --apply && /opt/homebrew/bin/python3.14 scripts/sync_cbis_skill_resources.py --check
/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/bryan/.codex/skills/analyze-cbis-apricot-data
/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/bryan/.codex/skills/prepare-cbis-normalized-import-bundle
/opt/homebrew/bin/python3.14 /Users/bryan/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/bryan/.codex/skills/maintain-cbis-data-tools
cd "/Users/bryan/Desktop/CBIS Data" && git diff --check
cd /Users/bryan/projects/nonprofit-manager && git diff --check
```

Bundle validator result for the new bundle:

```text
errors: []
warnings: []
contacts: ready 1293, review_required 73
mapping_row_count: 37106
gap_row_count: 103
```
