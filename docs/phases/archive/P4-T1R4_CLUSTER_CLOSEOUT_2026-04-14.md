# P4-T1R4 Cluster Closeout

**Last Updated:** 2026-04-19


**Date:** 2026-04-14  
**Rows reviewed:** `P4-T1R4`, `P4-T1R4W3B`, `P4-T1R4W3C`, `P4-T1R4W3D`, `P4-T1R4W3E`, `P4-T1R4W3F`

## Summary

- Audited the remaining wave-2 and wave-3 review rows against the current tree before removing any more modularization workboard entries.
- The wave-2 analytics, dashboard, and reports surfaces are clearly present on `main`, but the parent `P4-T1R4` row still spans later ops/comms work that is not yet ready to close as a single umbrella item.
- The `P4-T1R4W3B` through `P4-T1R4W3F` rows all have backend modules on `main`, but each row still falls short of the stated `backend module + wrapper + frontend feature + tests/policies` package in at least one concrete way.

## Validation

- `cd frontend && npm run type-check`
  - Result: Passed.
- `cd backend && npm run type-check`
  - Result: Passed.
- `make check-links`
  - Result: Passed. Checked `91` files and `682` local links with no broken active-doc links.
- `make build-backend`
  - Result: Passed.
- `make build-frontend`
  - Result: Passed, including the frontend bundle-budget check.

## Row Assessment

- `P4-T1R4`
  - Current-tree proof: wave-2 analytics, dashboard, and reports routing is live in `backend/src/routes/v2/index.ts`, `frontend/src/routes/analyticsRoutes.tsx`, `frontend/src/features/dashboard/routeComponents.tsx`, and `frontend/src/features/reports/routes/createReportRoutes.tsx`.
  - Mismatch: the parent row still promises later ops/comms surfaces while several remaining child review rows are not ready to close.
  - Conclusion: keep in `Review`.
- `P4-T1R4W3B`
  - Current-tree proof: the backend activities module is present in `backend/src/modules/activities/**` and mounted through `/api/v2`.
  - Mismatch: there is no dedicated `frontend/src/features/activities/**` package or equivalent row-local frontend feature/test bundle on `main`.
  - Conclusion: keep in `Review`.
- `P4-T1R4W3C`
  - Current-tree proof: the backend webhooks module and integration wrapper exports are present in `backend/src/modules/webhooks/**` and `backend/src/services/domains/integration/index.ts`; frontend feature state exists in `frontend/src/features/webhooks/state/webhooksCore.ts`.
  - Mismatch: the frontend surface is still feature-state plus admin consumer wiring, not a clearly self-contained frontend feature package that matches the row wording.
  - Conclusion: keep in `Review`.
- `P4-T1R4W3D`
  - Current-tree proof: the backend Mailchimp module and integration wrapper exports are present in `backend/src/modules/mailchimp/**` and `backend/src/services/domains/integration/index.ts`; frontend feature state exists in `frontend/src/features/mailchimp/state/mailchimpCore.ts`.
  - Mismatch: the visible UI still lives under `frontend/src/features/adminOps/pages/EmailMarketingPage.tsx` rather than a dedicated frontend Mailchimp feature surface.
  - Conclusion: keep in `Review`.
- `P4-T1R4W3E`
  - Current-tree proof: the backend invitations module and wrapper exports are present in `backend/src/modules/invitations/**` and `backend/src/services/domains/integration/index.ts`; the runtime invitation flows still exist in auth/admin surfaces.
  - Mismatch: there is no dedicated `frontend/src/features/invitations/**` package matching the row wording.
  - Conclusion: keep in `Review`.
- `P4-T1R4W3F`
  - Current-tree proof: the backend meetings module is present in `backend/src/modules/meetings/**` and mounted through `/api/v2`.
  - Mismatch: this row is still missing a dedicated wrapper artifact, frontend feature package, and row-local tests/docs that would satisfy its stated package contract.
  - Conclusion: keep in `Review`.

## Conclusion

- This note is the row-local proof artifact for why `P4-T1R4` and `P4-T1R4W3B` through `P4-T1R4W3F` remain on the live workboard after the 2026-04-14 aggressive closeout pass.
- No code changes were required for this review; the result of the pass is a decision-complete keep-in-review judgment rather than a repo patch.

## 2026-04-19 Addendum

- Fresh current-tree inspection on 2026-04-19 supersedes two stale frontend-gap statements above.
- `P4-T1R4W3B`
  - Updated current-tree proof: an untracked `frontend/src/features/activities/**` package exists locally.
  - Updated mismatch: the remaining gap is frontend contract drift, not package absence. The activities types, client unwrapping, and renderers are still out of sync with the live `/api/v2/activities` success-envelope payload, and the dashboard/contact activity consumers still duplicate non-feature fetch and type handling.
- `P4-T1R4W3E`
  - Updated current-tree proof: public accept-invitation pages already live under `frontend/src/features/invitations/**`, with auth and portal route seams pointing at those feature-owned pages.
  - Updated mismatch: the remaining frontend gap is the staff invitation-management slice, which still lives in admin-settings state and UI instead of a feature-owned invitations boundary.
- Post-wave status: the 2026-04-19 implementation pass landed the activities contract-alignment and invitations staff-management extraction follow-through in the current tree. For live status and verification, prefer the current carry-over or Phase 5 rows in [../planning-and-progress.md](../planning-and-progress.md) over the historical 2026-04-14 mismatch notes above.
- The other 2026-04-14 keep-in-review conclusions remain valid until their row-local implementation gaps are closed and re-verified.
