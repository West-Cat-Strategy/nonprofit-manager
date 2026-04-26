# P5-T10 Dead Docs Review - 2026-04-25

**Task:** `P5-T10` dead docs review.
**Scope:** Review artifact only. No docs were deleted, moved to archive, or consolidated in this pass.
**Write boundary:** This file only. The live workboard and validation index were read but not edited.

## Methodology

- Re-read the current docs entry points: [docs/README.md](../README.md), [docs/validation/README.md](README.md), [docs/phases/archive/README.md](../phases/archive/README.md), and [docs/phases/planning-and-progress.md](../phases/planning-and-progress.md).
- Confirmed the `P5-T10` row is review-only and must preserve canonical navigation plus validation evidence that backs active workboard rows.
- Built a Markdown inventory with `rg --files -g '*.md' docs | sort`.
- Ran a Markdown-link inbound scan across repo Markdown files, excluding generated dependency trees, to find docs with no inbound Markdown links and section peers missing from their local index.
- Ran a duplicate-title scan by first `#` heading. No duplicate H1 titles were found.
- Ran a keyword sweep for `TODO`, `FIXME`, `TBD`, `WIP`, `obsolete`, `stale`, `deprecated`, `retired`, `superseded`, `historical`, `archive`, and `legacy` in `docs/**/*.md`.
- Checked selected candidates against current workboard evidence, archive indexes, section indexes, and script existence before classifying them.

## Active Navigation Findings

The main navigation layer is mostly healthy. [docs/README.md](../README.md) separates contributor workflow, live planning, current phase roadmap, validation artifacts, product docs, feature docs, UI docs, quick references, and phase archive history. Section indexes for API, features, product, quick reference, UI, and validation all cover their peer docs.

Notable navigation gaps:

| Candidate | Evidence | Recommendation |
|---|---|---|
| [docs/deployment/publishing-deployment.md](../deployment/publishing-deployment.md) | No inbound Markdown link was found, but the live workboard names it as an owned path for the `P5-T4` `docs-e2e` lane. | Keep. Add a Markdown link from [docs/README.md](../README.md), [docs/features/TEMPLATE_SYSTEM.md](../features/TEMPLATE_SYSTEM.md), or a future deployment index so the active publishing guide is discoverable outside workboard path text. |
| [docs/backend/BACKEND_SERVICE_REFACTORING_GUIDE.md](../backend/BACKEND_SERVICE_REFACTORING_GUIDE.md) | It labels itself as historical/planning guidance and has only an archived quick-reference inbound link. | Keep for now. Later either link it from a development archive/reference index or move it under an archive path after confirming `P5-T11` no longer needs it as refactor context. |
| [docs/verification/VERIFICATION_SYSTEM.md](../verification/VERIFICATION_SYSTEM.md) | No inbound Markdown link; referenced scripts `scripts/verify.sh` and `scripts/verify-pr.sh` still exist and are executable. | Keep or re-home. Add a link from [docs/testing/TESTING.md](../testing/TESTING.md) or [scripts/README.md](../../scripts/README.md) if PR verification remains active; otherwise move the directory to validation or phase archive in a later cleanup. |
| [docs/verification/PR-9-VERIFICATION.md](../verification/PR-9-VERIFICATION.md) | Point-in-time report for a merged PR with no inbound Markdown link. | Archive later with other dated validation/phase evidence if it remains useful; do not delete in this pass. |
| [docs/THEME_SYSTEM.md](../THEME_SYSTEM.md) | Not directly linked as a top-level peer by [docs/README.md](../README.md), but intentionally linked from [docs/ui/README.md](../ui/README.md). | No cleanup needed; current UI index owns this path. |

## Archive Findings

The archive split is working: [docs/phases/archive/README.md](../phases/archive/README.md) says archived files are provenance, not current status, and current live planning stays in [docs/phases/planning-and-progress.md](../phases/planning-and-progress.md) and [docs/phases/PHASE_5_DEVELOPMENT_PLAN.md](../phases/PHASE_5_DEVELOPMENT_PLAN.md).

Notable archive cleanup opportunities:

| Area | Evidence | Recommendation |
|---|---|---|
| Phase archive wildcard groups | Several earlier Phase 1, Phase 2, and Week 1 files are grouped by filename pattern rather than explicit links. They are historical, not dead, but lower-discoverability. | Expand the wildcard groups into explicit links when touching the phase archive next, or add a short note that wildcard groups intentionally stand for retained bulk history. |
| [docs/development/archive/README.md](../development/archive/README.md), [docs/performance/archive/README.md](../performance/archive/README.md), [docs/security/archive/README.md](../security/archive/README.md) | These archive indexes have little or no inbound navigation from active section docs. | Add section-level entry links from active docs or the main catalog so local archives are discoverable without filesystem search. |
| [docs/performance/PERFORMANCE_OPTIMIZATION.md](../performance/PERFORMANCE_OPTIMIZATION.md) | No inbound Markdown link and reads like a broad guide, while [docs/performance/PERFORMANCE_OPTIMIZATION_REPORT.md](../performance/PERFORMANCE_OPTIMIZATION_REPORT.md) explicitly labels itself as historical evidence. | Decide whether this is still active performance guidance. If not, move or label it through the performance archive in a future cleanup. |
| [docs/security/SECURITY_AUDIT.md](../security/SECURITY_AUDIT.md) and [docs/security/PHASE_3_EXTERNAL_SECURITY.md](../security/PHASE_3_EXTERNAL_SECURITY.md) | Both are historical or planning-oriented and currently have no inbound Markdown links. | Keep as security provenance until a security owner confirms archive placement; link from [docs/security/archive/README.md](../security/archive/README.md) or move later. |

## Validation Findings

The active validation index is intentionally small and should stay protective. [docs/validation/README.md](README.md) lists active validation notes, the Phase 5 proof order, and the validation archive handoff. [docs/validation/archive/README.md](archive/README.md) covers all peer archived validation artifacts.

Do not remove or archive these active validation docs while their rows are active or in review:

| Artifact | Active reason |
|---|---|
| [PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) | Backs `P5-T2A` and `P5-T2B` validation status and the current host/Docker proof sequence. |
| [PHASE_5_SECURITY_REVIEW_2026-04-22.md](PHASE_5_SECURITY_REVIEW_2026-04-22.md) | Backs current security-hardening context and active Phase 5 security follow-through. |
| [PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md) | Backs `P5-T2D` and the planning briefs that reference persona workflow evidence. |
| [P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) | Backs the `P5-T4` managed public form publish-loop review. |
| [AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md) | Backs auth-alias telemetry/deprecation monitoring. |
| [VALIDATION_SCHEMAS_REFERENCE.md](VALIDATION_SCHEMAS_REFERENCE.md) | Current reference doc linked from the validation index. |

Additional validation note:

- [docs/testing/DARK_MODE_ACCESSIBILITY_AUDIT.md](../testing/DARK_MODE_ACCESSIBILITY_AUDIT.md) is not linked directly from the main catalog, but it is linked from [docs/testing/TESTING.md](../testing/TESTING.md) and describes the current Playwright dark-mode audit command. Keep it active unless the testing guide removes that lane.

## API And Feature Findings

The API and feature indexes are in good shape:

- [docs/api/README.md](../api/README.md) links every peer API Markdown doc and describes itself as navigation, not the full endpoint reference.
- [docs/features/README.md](../features/README.md) links every current feature peer and points historical feature plans to [docs/features/archive/README.md](../features/archive/README.md).
- [docs/features/archive/README.md](../features/archive/README.md) links every peer archived feature doc.
- No duplicate H1 titles were found among docs Markdown files.

Scoped API/feature cleanup opportunities:

| Candidate | Evidence | Recommendation |
|---|---|---|
| [docs/development/WC_MANAGE_PATTERN_ADOPTION_AUDIT.md](../development/WC_MANAGE_PATTERN_ADOPTION_AUDIT.md) | No inbound Markdown links; dated 2026-02-23; overlaps with current backend/module guardrail and reference-pattern docs. | Preserve until `P5-T11` planning decides whether it is still useful. Later consolidate the durable pieces into current development docs or archive it as historical pattern-adoption evidence. |
| [docs/development/reference-patterns/P4-T2/](../development/reference-patterns/P4-T2/adoption-spec.md), [P4-T4](../development/reference-patterns/P4-T4/adoption-spec.md), and [P4-T4F](../development/reference-patterns/P4-T4F/adoption-spec.md) Markdown sets | Their individual adoption specs, check matrices, and pattern catalogs have no inbound Markdown links, but [docs/development/archive/README.md](../development/archive/README.md) says these Markdown reference sets were intentionally retained. | Add a `reference-patterns/README.md` or explicit links from the development archive before considering any move. Do not delete without a P5-T11/P5-T9 coordination check. |
| [docs/development/reference-patterns/P5-T6-oss-benchmark/check-matrix.md](../development/reference-patterns/P5-T6-oss-benchmark/check-matrix.md) | No inbound Markdown link, while the workboard links the sibling adoption spec and pattern catalog. | Link from the adoption spec or pattern catalog if it is part of the P5-T6 evidence set; otherwise mark it historical in the same reference-patterns index. |
| [docs/deployment/publishing-deployment.md](../deployment/publishing-deployment.md) | Active P5-T4 publishing guide with API-style endpoint tables and feature workflow detail. | Keep near deployment or explicitly cross-link from API/features. Do not fold into API docs until the publishing owner confirms the deployment-specific content should move. |

## Scoped Cleanup Recommendations

1. Add missing navigation links before any archive move. The strongest candidates are the publishing deployment guide, verification docs, local archive indexes, and retained reference-pattern sets.
2. Create or expand a reference-patterns index so intentionally retained P4 and P5 pattern documents are not misclassified as dead.
3. Treat point-in-time PR and security/performance reports as archive candidates, not deletion candidates.
4. Keep active validation notes in place until their workboard rows close and the validation index explicitly hands them to the archive.
5. Use `P5-T11` to decide whether historical refactor and pattern-adoption docs still feed the modularity/simplicity plan before moving them.

## Non-removal Boundaries

- No active validation artifact listed in [docs/validation/README.md](README.md) should be removed in the dead-docs lane.
- No file referenced as evidence from the live workboard should be moved without updating the row evidence in the same future change.
- Path-only workboard owned docs, especially [docs/deployment/publishing-deployment.md](../deployment/publishing-deployment.md), should not be treated as dead solely because they lack inbound Markdown links.
- Historical archive docs are not dead by default. The repo uses archives to preserve provenance and proof for closed rows.
- The three tracked persona/benchmark skill reference trees remain canonical detailed evidence for persona and benchmark analysis; do not consolidate them into docs/product summaries.
- This review intentionally made no deletion, archive-move, validation-index, or workboard changes.

## Commands And Results

| Command | Result |
|---|---|
| `rg --files -g '*.md' docs \| sort` | Inventory collected for the docs tree. |
| Markdown-link inbound scan using a local Node script | Identified likely orphan or under-linked docs; duplicate H1 title scan found no duplicates. |
| `rg -n "\\b(TODO\|FIXME\|TBD\|WIP\|obsolete\|stale\|deprecated\|retired\|superseded\|historical\|archive\|legacy)\\b" docs -g '*.md'` | Keyword review found many intentional historical/archive labels and a small set of under-linked historical or planning docs. |
| `test -x scripts/verify.sh` and `test -x scripts/verify-pr.sh` | Both verification scripts exist and are executable, so [docs/verification/VERIFICATION_SYSTEM.md](../verification/VERIFICATION_SYSTEM.md) is under-linked rather than obviously invalid. |
| `make check-links` | Passed. Checked 144 files and 1217 local links; no broken active-doc links found. |
