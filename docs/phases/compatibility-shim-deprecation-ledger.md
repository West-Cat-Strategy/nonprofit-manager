# Compatibility Shim Deprecation Ledger

# Compatibility Shim Deprecation Ledger

**Last updated:** April 13, 2026

This ledger tracks shims retained for wave-safe compatibility and their planned retirement. `P4-T1R8E` keeps this inventory limited to explicit retained compatibility surfaces; dead wrappers removed by the modularization sweep should be retired instead of remaining documented as policy exceptions.

| Shim file | Canonical replacement | Why kept | Sunset target |
| --- | --- | --- | --- |
| `backend/src/routes/payments.ts` | `@modules/payments` via `createPaymentsRoutes` | Remaining intentional legacy v1 mount compatibility for the `/api/payments/*` surface. | `P4-T1R7` completion |

## Remediation notes

- Keep shim comments explicit with `@deprecated`, replacement target, and sunset note to preserve migration intent.
- Remove a shim only after all known importers migrate and policy gates are green for the affected domain.
- `P4-T1R8E` keeps the retained backend shim set explicit: `backend/src/routes/payments.ts` remains the lone route-level compatibility bridge, and the retired publishing service facades now resolve directly through the canonical publishing and public-runtime module entrypoints.
- The frontend modularization wave in April 2026 retired the root admin, neo-brutalist, workflows, and engagement-event page wrappers and redirected tests to feature-owned page modules.
- `P4-T1R8E` remains the follow-up sweep for any additional dead wrappers/barrels only when importers are gone; the backend payment shim above is the only frontendless compatibility exception that should continue to appear in this ledger.
- `P4-T1R7` retired the dead backend payment controller/domain export shims plus the builder/finance/engagement page wrappers after the importer sweep turned up no runtime callers.
- `P4-T1R7D` retired the remaining unmounted top-level backend route shims, leaving `backend/src/routes/payments.ts` as the lone documented compatibility exception.
- `P4-T1R8A` moved the remaining active `workflows`, `savedReports` public snapshot, `builder` site-aware helper, and `neo-brutalist` runtime implementations into `frontend/src/features/**`; the `frontend/src/pages/**` files now remain only as thin compatibility wrappers and must not be used by root runtime imports.
- `P4-T1R8B` moved auth/accounts/contacts/volunteers/workflows/saved-reports-public/neo-brutalist lazy route exports behind feature-owned `routeComponents.tsx` files so `frontend/src/routes/**` stays a thin composition layer for the migrated surfaces.
- `P4-T1R8C` moved website console route ownership behind `frontend/src/features/websites/routeComponents.tsx`, rewired canonical builder-helper imports to `frontend/src/features/builder/lib/siteAwareEditor.ts`, and switched runtime publishing callers to `@services/publishing` while keeping the documented root shims as thin facades only.
- `P4-T1R8D` ratcheted the frontend legacy-path policy and canonical-module policy to guard the retained route/publishing facades, and refreshed the workboard plus modularity reference docs to point at the new canonical surfaces.
- `P4-T1R8E` is the follow-up sweep that removes additional dead wrappers/barrels only when importers are gone; the surviving shims listed above remain the sole compatibility exceptions that should continue to appear in this ledger.
