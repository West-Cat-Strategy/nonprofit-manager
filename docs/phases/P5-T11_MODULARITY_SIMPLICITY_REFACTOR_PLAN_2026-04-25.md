# P5-T11 Modularity And Simplicity Refactor Plan

**Last Updated:** 2026-04-25

**Task:** `P5-T11`  
**Status:** Planning artifact  
**Inputs:** [planning-and-progress.md](planning-and-progress.md), [../development/SUBAGENT_MODULARIZATION_GUIDE.md](../development/SUBAGENT_MODULARIZATION_GUIDE.md), [../development/BACKEND_MODULE_OWNERSHIP_MAP.md](../development/BACKEND_MODULE_OWNERSHIP_MAP.md), [../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md](../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md), [../validation/P5-T9_DEAD_CODE_REVIEW_2026-04-25.md](../validation/P5-T9_DEAD_CODE_REVIEW_2026-04-25.md), and [../validation/P5-T10_DEAD_DOCS_REVIEW_2026-04-25.md](../validation/P5-T10_DEAD_DOCS_REVIEW_2026-04-25.md).

## Summary

This plan sequences broad cleanup after the Phase 5 review sweep. It keeps the refactor behavior-preserving, avoids deleting shared compatibility surfaces from a review-only row, and reserves shared `/api/v2`, route catalog, root store, auth/workspace-module, browser URL, and workboard changes for the lead.

The final sweep also ran `make lint`; it passed policy checks until the implementation-size policy, then stopped on four oversized files. That lint outcome needs a scoped cleanup row before the final all-green lane can honestly close.

## Refactor Sequence

1. **Implementation-size policy cleanup (`P5-T11A`)**
   - Scope: split or extract behavior-preserving helpers from the four files that currently stop `make lint`: `backend/src/modules/cases/routes/index.ts`, `backend/src/modules/mailchimp/services/mailchimpService.ts`, `frontend/src/features/mailchimp/components/EmailMarketingPageParts.tsx`, and `frontend/src/types/case.ts`.
   - Keep route shapes, service behavior, frontend user flows, public types, and current tests stable.
   - Prefer domain-owned helpers or submodules over new generic abstractions; update implementation-size baselines only after the code shape changes are deliberate.
   - Validation: targeted cases/mailchimp/backend/frontend tests for touched seams, `cd backend && npm run type-check`, `cd frontend && npm run type-check`, `make lint`, and `make typecheck`.

2. **Backend root service shim retirement (`P5-T9A`)**
   - Scope: remove only the Knip-reported root `backend/src/services/*` re-export wrappers after confirming no internal, docs, deployment, or external callers need those paths.
   - Keep canonical implementations under `backend/src/modules/**`; do not change route shapes or worker behavior.
   - Validation: `cd backend && npm run type-check`, targeted reports/saved-reports/scheduled-reports/social-media/webhooks tests, `make lint`, and `npm run knip`.

3. **Frontend builder root component shim retirement (`P5-T9B`)**
   - Scope: retire root `frontend/src/components/editor/**` and `frontend/src/components/templates/**` builder wrappers as one coordinated frontend cleanup.
   - Migrate or remove root-level compatibility tests deliberately, and update implementation-size baselines or ownership notes in the same row.
   - Validation: `cd frontend && npm run type-check`, builder/editor Vitest slices, route-catalog or builder route tests only if ownership changes, `make lint`, and `npm run knip`.

4. **Knip configuration hardening (`P5-T9C`)**
   - Scope: model real backend/frontend entrypoints and policy tooling so future dead-code findings are more precise.
   - Keep deleted-path guards, policy scripts, E2E wrappers, and route-audit helpers visible to tooling.
   - Validation: `npm run knip`, `make test-tooling`, and `make lint`.

5. **Docs navigation and archive indexing cleanup (`P5-T10A`)**
   - Scope: add missing navigation links for under-linked active docs before moving anything to archive.
   - Initial targets: publishing deployment guide, verification docs, local archive indexes, and retained reference-pattern sets.
   - Validation: `make check-links`; add `make lint-doc-api-versioning` only if `/api/v2` wording or examples change.

6. **Historical refactor/reference-doc disposition**
   - After the rows above, decide whether historical refactor and pattern-adoption docs still feed active architecture guidance.
   - Move or relabel only after active docs link to replacements and no workboard evidence depends on the old path.

## Shared Contracts

- Preserve active `/api/v2/*` APIs, health aliases, route registrars, frontend route catalogs, root store shape, auth/permission policy, workspace-module behavior, and browser URLs.
- Preserve feature-owned implementations under `backend/src/modules/**` and `frontend/src/features/**`; cleanup rows target wrappers, indexes, and navigation first.
- Keep compatibility-shim decisions in [../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md](../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md) when a row retires a compatibility-shaped surface.

## Assumptions

- `P5-T9` and `P5-T10` remain review artifacts only; removals happen under future scoped rows.
- `P5-T12` waits until cleanup rows, including `P5-T11A`, are either complete, explicitly deferred, or ruled unnecessary.
- Any new modularization sub-lane must follow [../development/SUBAGENT_MODULARIZATION_GUIDE.md](../development/SUBAGENT_MODULARIZATION_GUIDE.md) before edits start.
