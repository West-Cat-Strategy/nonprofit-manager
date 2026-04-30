# Phase 5 Review Queue Closeout

**Last Updated:** 2026-04-30

**Date:** 2026-04-30

This artifact preserves the closeout for the late-April Phase 5 review rows that no longer own concrete live-board work after the combined review pass.

## Summary

- Kept `P5-T6` live as the Phase 5 backlog scope-control gate.
- Closed the case-form revision loop, workbench dashboard entry point, local-only CI/CD readback, website-builder audit follow-through, builder movement and authoring controls, unused-file prune, and event-registration browser-proof rows.
- Resolved review findings found during the closeout pass: stale revision metadata on resubmission, keyboard-focusable hidden builder toolbar controls, static `/events` page fallback shadowing, stale Phase 5 roadmap status, and the UI audit baseline mismatch.

## Removed Rows

| Row | Disposition | Evidence |
|---|---|---|
| `P5-T18` | Removed from live board; case-form revision-capable review loop is proof-complete. | Staff revision requests require notes, resubmission clears assignment-level revision metadata, and linked review follow-up closure remains staff-owned. |
| `P5-T19` | Removed from live board; workbench saved-queue dashboard entry points are proof-complete. | Dashboard queue views remain authenticated, owner-scoped, and limited to `workbench` entries, with fixed focus cards preserved. |
| `P5-T20` | Removed from live board; local-only CI/CD refactor review is proof-complete. | `.github/workflows` is absent, branch protection has no required status checks, force-push/deletion protections remain disabled, and hook install dry-run passes. |
| `P5-T21` | Removed from live board; website-builder functions audit follow-through is proof-complete. | Event-registration contract alignment, referral-form editor coverage, and managed-form smoke coverage are preserved in [../../validation/WEBSITE_BUILDER_FUNCTIONS_AUDIT_2026-04-30.md](../../validation/WEBSITE_BUILDER_FUNCTIONS_AUDIT_2026-04-30.md). |
| `P5-T22` | Removed from live board; builder drag/drop semantics hardening is proof-complete. | Helper-owned movement tests cover raw IDs, legacy wrapper IDs, section drops, pointer-aware insertion, cross-section moves, empty-section drops, and no-op guardrails. |
| `P5-T23` | Removed from live board; verified unused-file modularity prune is proof-complete. | Current `knip` evidence is clean, import tracing finds only workboard owned-path references to deleted files, and boundary/type/lint gates pass. |
| `P5-T24` | Removed from live board; builder selected-item authoring controls are proof-complete. | Selected component/section duplicate and move controls are visible only for selected items, and duplicate ID rewriting stays limited to builder-owned child collections. |
| `P5-T25` | Removed from live board; event-registration managed-form browser proof is complete. | Event route fallbacks, runtime visitor/session metadata, and the targeted publish/public-site Playwright slice are green. |

## Rows Still Live

- `P5-T6` remains live as the Phase 5 backlog scope-control gate. Future typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, and generic workflow tooling need separately scoped rows before runtime work starts.

## Validation

The closeout pass used targeted proof:

- `cd backend && npx jest --forceExit --runInBand src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts src/modules/cases/repositories/__tests__/caseFormsRepository.assignments.test.ts`
- `cd backend && npm test -- --runInBand src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts`
- `cd frontend && npm test -- --run src/features/cases/components/__tests__/CaseFormsPanel.test.tsx src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/features/builder/components/editor/__tests__/PropertyPanel.test.tsx src/features/websites/lib/__tests__/websiteConsole.test.ts src/features/builder/pages/__tests__/pageEditorControllerHelpers.test.ts src/features/builder/pages/__tests__/usePageSectionEditing.test.tsx src/features/builder/components/editor/__tests__/EditorCanvas.test.tsx`
- `cd backend && npx jest --forceExit --runInBand src/__tests__/services/template/helpers.test.ts src/__tests__/services/publishing/formRegistryService.test.ts src/__tests__/services/publishing/publicSiteRenderer.test.ts src/__tests__/services/publishing/siteOperationsService.test.ts`
- `cd frontend && npm run type-check`
- `cd backend && npm run type-check`
- `make typecheck`
- `npm run knip`
- `node scripts/check-frontend-feature-boundary-policy.ts && node scripts/check-module-boundary-policy.ts && node scripts/check-canonical-module-import-policy.ts && node scripts/check-implementation-size-policy.ts`
- `node scripts/ui-audit.ts --enforce-baseline`
- `make lint`
- `make db-verify`
- `make check-links`
- `cd e2e && bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/publishing.spec.ts tests/public-website.spec.ts`
- `git diff --check`
- `if [ -d .github/workflows ]; then find .github/workflows -maxdepth 1 -type f -print; else echo '.github/workflows missing (no workflow files)'; fi`
- `gh api repos/West-Cat-Strategy/nonprofit-manager/branches/main/protection --jq '{required_status_checks, allow_force_pushes, allow_deletions}'`
- `./scripts/install-git-hooks.sh --dry-run`
