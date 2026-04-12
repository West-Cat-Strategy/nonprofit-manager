# Compatibility Shim Deprecation Ledger

<<<<<<< HEAD
**Last updated:** April 9, 2026

This ledger tracks shims retained for wave-safe compatibility and their planned retirement. Dead wrappers removed by the modularization sweep should be retired instead of remaining documented as policy exceptions.
=======
**Last updated:** March 19, 2026

This ledger tracks shims retained for wave-safe compatibility and their planned retirement. `P4-T1R8E` keeps this inventory limited to explicit retained compatibility surfaces; dead wrappers removed by the simplicity sweep should be retired instead of remaining documented as policy exceptions.
>>>>>>> origin/main

| Shim file | Canonical replacement | Why kept | Sunset target |
| --- | --- | --- | --- |
| `backend/src/routes/payments.ts` | `@modules/payments` via `createPaymentsRoutes` | Remaining intentional legacy v1 mount compatibility for the `/api/payments/*` surface. | `P4-T1R7` completion |
<<<<<<< HEAD
=======
| `frontend/src/components/contactForm/**` | `frontend/src/features/contacts/components/contactForm/**` | Compatibility re-exports while workflow/tests finish moving to the feature-owned contacts form surface. | `P4-T1R8A` completion |
| `frontend/src/components/people/**` | `frontend/src/features/people/components/**` | Compatibility re-exports while the shared people list/detail/import-export consumers finish migrating to the feature-owned package. | `P4-T1R8A` completion |
| `frontend/src/hooks/useImportExport.ts` | `frontend/src/features/people/hooks/useImportExport.ts` | Thin wrapper preserved while any straggling imports move off the root hook path. | `P4-T1R8A` completion |
| `frontend/src/services/peopleImportExportApi.ts` | `frontend/src/features/people/services/peopleImportExportApi.ts` | Thin wrapper preserved while any straggling imports move off the root service path. | `P4-T1R8A` completion |
| `frontend/src/routes/peopleRoutePreload.ts` | `frontend/src/features/contacts/routePreload.ts` | Thin preload facade preserved while any remaining non-runtime callers move to the feature-owned contacts preload helper. | `P4-T1R8D` completion |
| `frontend/src/pages/builder/siteAwareEditor.ts` | `frontend/src/features/builder/lib/siteAwareEditor.ts` | Thin builder-helper facade preserved while compatibility tests still target the page-layer wrapper path. | `P4-T1R8D` completion |
| `frontend/src/pages/public/PublicReportSnapshot.tsx` | `frontend/src/features/savedReports/pages/PublicReportSnapshotPage.tsx` | Thin page wrapper preserved for compatibility while runtime routes resolve through the feature-owned public snapshot surface. | `P4-T1R8D` completion |
>>>>>>> origin/main
## Remediation notes

- Keep shim comments explicit with `@deprecated`, replacement target, and sunset note to preserve migration intent.
- Remove a shim only after all known importers migrate and policy gates are green for the affected domain.
- `P4-T1R8E` keeps the retained backend shim set explicit: `backend/src/routes/payments.ts` remains the lone route-level compatibility bridge, and the retired publishing service facades now resolve directly through the canonical publishing and public-runtime module entrypoints.
<<<<<<< HEAD
- The frontend modularization wave in April 2026 retired the root admin, neo-brutalist, workflows, and engagement-event page wrappers and redirected tests to feature-owned page modules.
- `P4-T1R8E` remains the follow-up sweep for any additional dead wrappers/barrels only when importers are gone; the backend payment shim above is the only frontendless compatibility exception that should continue to appear in this ledger.
=======
- `P4-T1R8E` also keeps the retained frontend shim set explicit: the root contact-form and people import/export facades, `frontend/src/routes/peopleRoutePreload.ts`, `frontend/src/pages/builder/siteAwareEditor.ts`, and `frontend/src/pages/public/PublicReportSnapshot.tsx` remain compatibility wrappers only until their importer sweeps complete.
- `P4-T1R7` retired the dead backend payment controller/domain export shims plus the builder/finance/engagement page wrappers after the importer sweep turned up no runtime callers.
- `P4-T1R7D` retired the remaining unmounted top-level backend route shims, leaving `backend/src/routes/payments.ts` as the lone documented compatibility exception.
- `P4-T1R8A` moved the remaining active `workflows`, `savedReports` public snapshot, `builder` site-aware helper, and `neo-brutalist` runtime implementations into `frontend/src/features/**`; the `frontend/src/pages/**` files now remain only as thin compatibility wrappers and must not be used by root runtime imports.
- `P4-T1R8A` also moved the contact-form and people import/export surfaces into feature-owned packages, leaving only thin root compatibility shims that are now covered by the frontend legacy-path ratchet.
- `P4-T1R8A` now marks the remaining root contact-form, people, hook, and service facades with explicit `@deprecated` replacement guidance, and the last stale contact-list mock has moved to the feature-owned people package.
- `P4-T1R8B` moved auth/accounts/contacts/volunteers/workflows/saved-reports-public/neo-brutalist lazy route exports behind feature-owned `routeComponents.tsx` files so `frontend/src/routes/**` stays a thin composition layer for the migrated surfaces.
- `P4-T1R8B` now extends that route-surface cleanup to admin, analytics, alerts, dashboard, portal, events, tasks, cases, follow-ups, team-chat, and the contacts preload seam; runtime imports are policy-blocked from using the retained root route facades.
- `P4-T1R8C` moved website console route ownership behind `frontend/src/features/websites/routeComponents.tsx`, rewired canonical builder-helper imports to `frontend/src/features/builder/lib/siteAwareEditor.ts`, and switched runtime publishing callers to `@services/publishing` while keeping the documented root shims as thin facades only.
- `P4-T1R8D` ratcheted the frontend legacy-path policy and canonical-module policy to guard the retained route/publishing facades, and refreshed the workboard plus modularity reference docs to point at the new canonical surfaces.
- `P4-T1R8E` is the follow-up sweep that removes additional dead wrappers/barrels only when importers are gone; the surviving shims listed above remain the sole compatibility exceptions that should continue to appear in this ledger.
>>>>>>> origin/main
