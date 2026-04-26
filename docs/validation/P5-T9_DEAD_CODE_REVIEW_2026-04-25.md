# P5-T9 Dead Code Review - 2026-04-25

**Status:** Review artifact only. No source files, workboard rows, validation index entries, or compatibility shims were removed or edited for this review.

## Scope

`P5-T9` asked for a repo-wide dead-code and unused-export review across backend, frontend, scripts, and E2E helpers, with cleanup recommendations only. This review separates Knip findings from active compatibility contracts, dynamic route surfaces, policy tooling, and test helpers that are intentionally retained.

The review was run against the current working tree on 2026-04-25. The tree already had unrelated in-progress changes in backend API-key/webhook files and `docs/phases/planning-and-progress.md`; those files were left untouched.

## Methodology

1. Read the `P5-T9` workboard row and `Recent Thread Follow-through` in [../phases/planning-and-progress.md](../phases/planning-and-progress.md).
2. Checked the current rules in [../development/CONVENTIONS.md](../development/CONVENTIONS.md), [../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md](../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md), [../testing/TESTING.md](../testing/TESTING.md), and `scripts/README.md`.
3. Reviewed `knip.json` and ran the repo command `npm run knip`.
4. Opened every Knip-reported file and classified whether it was an implementation, a re-export shim, a barrel, or a test/tooling helper.
5. Cross-checked static references with `rg`, then inspected key dynamic and contract surfaces:
   - backend route registrar: `backend/src/routes/v2/index.ts`
   - backend worker entry: `backend/src/worker.ts`
   - backend module barrels for reports, social media, and webhooks
   - frontend route composition and `routeComponents.tsx` lazy-import boundaries
   - feature-owned builder barrels under `frontend/src/features/builder/components/**`
   - E2E dynamic import recovery helper usage
   - Makefile and script policy-gate wiring

## Command Result

`npm run knip`

Result: exited `1`, which is Knip's normal non-zero result when findings are present.

Knip reported:

- `Unused files (23)`
- `Configuration hints (3)`
- no unused dependencies, unlisted dependencies, unresolved imports, or unused binaries beyond the config hint output

Full reported unused-file list:

```text
backend/src/services/reportService.ts
backend/src/services/reportTemplateService.ts
backend/src/services/savedReportService.ts
backend/src/services/scheduledReportService.ts
backend/src/services/socialMediaSyncSchedulerService.ts
backend/src/services/webhookRetrySchedulerService.ts
backend/src/services/webhookService.ts
backend/src/services/webhookTransport.ts
frontend/src/components/editor/ComponentPalette.tsx
frontend/src/components/editor/EditorCanvasRenderer.tsx
frontend/src/components/editor/EditorCanvasSocialIcons.tsx
frontend/src/components/editor/index.ts
frontend/src/components/editor/PageList.tsx
frontend/src/components/editor/propertyPanel/ComponentPropertyEditor.tsx
frontend/src/components/editor/propertyPanel/EventComponentPropertyEditor.tsx
frontend/src/components/editor/propertyPanel/FormComponentPropertyEditor.tsx
frontend/src/components/editor/propertyPanel/GenericStylePropertyEditor.tsx
frontend/src/components/editor/propertyPanel/options.ts
frontend/src/components/editor/propertyPanel/SectionPropertyEditor.tsx
frontend/src/components/editor/propertyPanel/types.ts
frontend/src/components/editor/readableForeground.ts
frontend/src/components/templates/index.ts
frontend/src/components/templates/TemplateCard.tsx
```

Configuration hints:

```text
frontend    knip.json  Add entry and/or refine project files in workspaces["frontend"] (15 unused files)
backend     knip.json  Add entry and/or refine project files in workspaces["backend"] (8 unused files)
knip        knip.json  Remove from ignoreBinaries
```

Additional validation from the final review sweep:

- `make typecheck` passed across backend, frontend, and shared contracts.
- `make lint` passed policy checks until the implementation-size policy, then stopped on `backend/src/modules/cases/routes/index.ts`, `backend/src/modules/mailchimp/services/mailchimpService.ts`, `frontend/src/features/mailchimp/components/EmailMarketingPageParts.tsx`, and `frontend/src/types/case.ts`.

That lint result is not a dead-code removal finding; it is queued as the `P5-T11A` implementation-size cleanup row.

## Backend Findings

### Knip-reported candidates

The eight backend files are root `backend/src/services/*` re-export wrappers:

- `reportService.ts` -> `@modules/reports/services/reportService`
- `reportTemplateService.ts` -> `@modules/reports/services/reportTemplateService`
- `savedReportService.ts` -> `@modules/savedReports/services/savedReportService`
- `scheduledReportService.ts` -> `@modules/scheduledReports/services/scheduledReportService`
- `socialMediaSyncSchedulerService.ts` -> `@modules/socialMedia/services/socialMediaSyncSchedulerService`
- `webhookRetrySchedulerService.ts` -> `@modules/webhooks/services/webhookRetrySchedulerService`
- `webhookService.ts` -> `@modules/webhooks/services/webhookService`
- `webhookTransport.ts` -> `@modules/webhooks/services/webhookTransport`

These are not independent implementations. Current in-repo runtime code imports the canonical module-owned implementations directly. For example, `backend/src/routes/v2/index.ts` mounts `@modules/reports`, `@modules/savedReports`, `@modules/scheduledReports`, `@modules/socialMedia`, and `@modules/webhooks`; `backend/src/worker.ts` imports the social-media and webhook schedulers from `@modules/*`; backend tests for these domains also use canonical module paths.

### Triage

These files are credible cleanup candidates, but they are also compatibility-shaped root service shims. The compatibility ledger currently names only the tombstoned `/api/payments/*` surface and says no active root shim files remain. That means these service wrappers should not be treated as blessed long-term contracts, but removing them should still be owner-led because old `@services/*` import paths may exist outside the current static graph or in docs/reference material.

No backend implementation module under `backend/src/modules/**` was classified as dead by this review.

## Frontend Findings

### Knip-reported candidates

The fifteen frontend findings are root builder/editor/template re-export wrappers:

- `frontend/src/components/editor/ComponentPalette.tsx`
- `frontend/src/components/editor/EditorCanvasRenderer.tsx`
- `frontend/src/components/editor/EditorCanvasSocialIcons.tsx`
- `frontend/src/components/editor/index.ts`
- `frontend/src/components/editor/PageList.tsx`
- `frontend/src/components/editor/propertyPanel/ComponentPropertyEditor.tsx`
- `frontend/src/components/editor/propertyPanel/EventComponentPropertyEditor.tsx`
- `frontend/src/components/editor/propertyPanel/FormComponentPropertyEditor.tsx`
- `frontend/src/components/editor/propertyPanel/GenericStylePropertyEditor.tsx`
- `frontend/src/components/editor/propertyPanel/options.ts`
- `frontend/src/components/editor/propertyPanel/SectionPropertyEditor.tsx`
- `frontend/src/components/editor/propertyPanel/types.ts`
- `frontend/src/components/editor/readableForeground.ts`
- `frontend/src/components/templates/index.ts`
- `frontend/src/components/templates/TemplateCard.tsx`

Each file points at a feature-owned implementation under `frontend/src/features/builder/components/**`.

### Triage

The active builder pages import from feature-owned barrels, not these root wrappers:

- `frontend/src/features/builder/pages/PageEditorPage.tsx` imports from `../components/editor`
- `frontend/src/features/builder/pages/templateGallery/TemplateGalleryContent.tsx` imports from `../../components/templates`

However, `frontend/src/components/editor/**` still appears in active workboard ownership notes and `scripts/baselines/implementation-size.json`, and nearby root wrappers are still test-covered (`EditorCanvas.tsx`, `EditorHeader.tsx`, `PropertyPanel.tsx`, `BasicComponentPropertyEditor.tsx`, and `PagePropertyEditor.tsx`). A partial deletion of only the Knip subset would leave a confusing compatibility island.

These are good candidates for a future frontend cleanup row, but the cleanup should retire the root builder/editor compatibility surface as a coordinated set, migrate or remove the root-level tests intentionally, and update any baselines in the same row.

No feature-owned builder implementation under `frontend/src/features/builder/**` was classified as dead by this review.

## Scripts Findings

Knip reported no unused script files.

This review did not classify ignored policy scripts as dead. `knip.json` currently ignores `scripts/check-*.ts`, `scripts/check-*.js`, `scripts/lib/*.ts`, and `scripts/ui-audit.ts`; those scripts are explicitly wired through the Makefile, `scripts/run-policy-checks.sh`, `make lint`, `make quality-baseline`, `make test-tooling`, and `scripts/README.md`.

The script surface is intentionally dynamic enough that a future tooling cleanup should start by refining Knip coverage, not deleting policy helpers.

## E2E Findings

Knip reported no unused E2E files.

The E2E workspace treats `tests/**/*.ts` as entries and `**/*.ts` as project files. The dynamic module-import recovery helper is active: `e2e/helpers/moduleImportRecovery.ts` is used by dark-mode, setup-launch, visibility-link, and UX regression specs, and it matches the Phase 5 browser-recovery evidence recorded in the testing-strategy review.

No E2E cleanup row is recommended from this P5-T9 pass.

## Explicit Non-Removal Boundaries

Do not remove these as part of P5-T9:

- The tombstoned `/api/payments/*` compatibility behavior tracked in [../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md](../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md).
- `/api/v2/*` route registrar exports and module route barrels.
- Health aliases at `/health`, `/api/health`, and `/api/v2/health`.
- Auth alias compatibility and telemetry-gated deprecation surfaces.
- Frontend `routeComponents.tsx` lazy-import boundaries and route catalogs.
- Feature-owned builder implementations under `frontend/src/features/builder/**`.
- Backend module implementations under `backend/src/modules/**`.
- Script policy gates, deleted-path guards, and tooling-contract helpers.
- E2E module-import recovery helpers and browser-runtime wrappers.
- Any unrelated in-progress backend/API-key or workboard changes already present in the working tree.

## Recommended Future Cleanup Rows

### P5-T9A - Backend Root Service Shim Retirement

Scope:

- Remove the eight Knip-reported `backend/src/services/*` re-export wrappers only after confirming no internal, docs, deployment, or external caller still depends on those root paths.
- Update stale docs/reference paths to canonical `backend/src/modules/**` locations.
- Decide whether the compatibility ledger should record the root service shim retirement before deletion.

Suggested validation:

- `cd backend && npm run type-check`
- targeted backend service/controller tests for reports, saved reports, scheduled reports, social media scheduler, and webhooks
- `make lint`
- `npm run knip`

### P5-T9B - Frontend Builder Root Component Shim Retirement

Scope:

- Retire root `frontend/src/components/editor/**` and `frontend/src/components/templates/**` builder re-export wrappers as a coordinated set.
- Migrate or remove root-level compatibility tests deliberately instead of deleting only the Knip subset.
- Update implementation-size baselines and any ownership notes that still name the retired root component paths.

Suggested validation:

- `cd frontend && npm run type-check`
- builder/editor Vitest slices, including the current root editor tests after they are migrated or intentionally removed
- route-catalog and builder route tests if route ownership changes
- `make lint`
- `npm run knip`

### P5-T9C - Knip Configuration Hardening

Scope:

- Add or refine Knip entries for the real backend and frontend app entrypoints, such as backend `src/index.ts` and frontend `src/main.tsx`, while keeping worker/public-site/test/runtime entries represented.
- Review whether `knip` should remain in `ignoreBinaries`.
- Model script policy gates explicitly enough that future unused-script findings are useful.

Suggested validation:

- `npm run knip`
- `make test-tooling`
- `make lint`

## Summary

The current static review found 23 credible cleanup candidates, all of them re-export wrappers. No active backend module implementation, feature-owned frontend implementation, script policy gate, or E2E helper was identified as safe to remove directly from this review.

The safest next move is to queue separate scoped cleanup rows for backend service shims, frontend builder root shims, and Knip configuration hardening, then run removals with owner-specific validation instead of combining them with this review artifact.
