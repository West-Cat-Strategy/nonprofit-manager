# Documentation Aggressive Prune Inventory - 2026-05-07

**Last Updated:** 2026-05-07

This note records the starting inventory and prune decisions for the aggressive documentation refactor branch. It is an inventory and decision record only; the structural cleanup lands in follow-up edits on the same branch.

## Scope

- Branch: `codex/docs-aggressive-prune`
- Worktree: `/Users/bryan/projects/nonprofit-manager-docs-aggressive-prune`
- Base commit: `59d9f0c9`
- Runtime/API/schema scope: none
- Protected current-work boundary: the dirty remediation checkout at `/Users/bryan/projects/nonprofit-manager` remains untouched

## Inventory

| Measure | Count |
|---|---:|
| Markdown files tracked by the repo inventory scan | 280 |
| Active non-archive docs under `docs/` | 169 |
| Archived docs under `docs/**/archive/` | 94 |
| Duplicate H1 headings found | 0 |
| Active non-archive Markdown files with no inbound Markdown links | 9 |

Largest active or navigation-relevant docs by line count:

| File | Lines | Disposition |
|---|---:|---|
| `docs/phases/planning-and-progress.md` | 1260 | Keep as live workboard; condense historical notes and stale completed-row context where safe |
| `docs/security/SECURITY_MONITORING_GUIDE.md` | 1057 | Keep as active operations guide; split or summarize long background sections |
| `docs/api/API_INTEGRATION_GUIDE.md` | 991 | Keep as active API integration guide; condense repeated examples and route-family prose |
| `docs/deployment/DEPLOYMENT.md` | 833 | Keep as active deployment guide; condense historical CI/CD material and link to release/test maps |
| `docs/features/TEMPLATE_SYSTEM.md` | 824 | Keep as active publishing reference; condense implementation history into current contracts |
| `docs/testing/COMPONENT_TESTING.md` | 793 | Keep as scoped testing guide; align navigation with `docs/testing/TESTING.md` |
| `docs/api/API_REFERENCE_DASHBOARD_ALERTS.md` | 703 | Keep as endpoint reference; do not rewrite unless API examples are verified |
| `docs/performance/PERFORMANCE_OPTIMIZATION_REPORT.md` | 610 | Historical evidence; move behind performance archive/navigation |
| `docs/performance/PERFORMANCE_OPTIMIZATION.md` | 591 | Historical/current mixed guide; condense to performance index plus retained evidence links |

## Orphan Review

| File | Decision |
|---|---|
| `backend/src/services/site-generator/README.md` | Keep. Code-adjacent ownership note for the legacy import path boundary. |
| `backend/tests/integration/TEST_RESULTS_TEMPLATE.md` | Keep or move later only with backend test-script cleanup; still belongs to the legacy integration script bundle. |
| `backend/tests/manual/README.md` | Keep or move later only with manual event script cleanup; referenced from archived event-module history. |
| `database/SCHEMA_DIAGRAM.md` | Keep. Code-adjacent schema diagram, not a general docs catalog page. |
| `docs/performance/p4-t9a-startup-request-map.md` | Keep as performance evidence but move behind archive/index navigation. |
| `docs/performance/p4-t9d-baseline-notes.md` | Keep as performance evidence but move behind archive/index navigation. |
| `docs/performance/p4-t9d-final-report.md` | Keep as performance evidence but move behind archive/index navigation. |
| `docs/validation/P5-T67_T71_READY_TOOLING_BROWSER_PROOF_2026-05-03.md` | Pruned in the follow-up cleanup. Superseded by row-local `P5-T67` and `P5-T71` proof notes plus later workboard/validation entries. |
| `docs/validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md` | Pruned in the follow-up cleanup. Superseded by row-local proof notes for the same batch. |

## Stale Wording Scan

The targeted wording scan found no active stale first-version API path misuse in nonprofit-manager API docs. The hits are third-party service paths for Plausible and Loki, which are intentional.

The `GitHub Actions` hits in active docs describe the current local-only CI/CD posture or superseded historical proof. Archive hits are historical and do not drive current validation.

## Prune Rules

- Do not delete a file that is the only evidence for an active or review-state workboard row.
- Prefer redirecting active navigation to section indexes instead of listing every dated proof artifact from `docs/README.md`.
- Prune redundant validation proofs only when a row-local proof note or closeout file carries the same useful evidence.
- Keep `AGENTS.md` and `agents.md` synchronized as orientation-only docs.
- Keep code-adjacent READMEs unless their owning code/scripts are removed in a separate implementation lane.

## Planned Cleanup Passes

1. Compact the root docs catalog and section indexes.
2. Add or refresh performance/deployment section navigation.
3. Condense active guide text without changing runtime/API contracts.
4. Prune redundant proof and point-in-time verification docs.
5. Run `make check-links`, `make lint-doc-api-versioning`, `git diff --check`, and targeted stale-path scans.
