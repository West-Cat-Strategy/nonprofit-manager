# Compatibility Shim Deprecation Ledger

**Last updated:** March 11, 2026

This ledger tracks shims retained for wave-safe compatibility and their planned retirement.

| Shim file | Canonical replacement | Why kept | Sunset target |
| --- | --- | --- | --- |
| `backend/src/controllers/paymentController.ts` | `backend/src/modules/payments/controllers/paymentController.ts` | Legacy callers still import `@controllers/paymentController`; module contract now owns behavior. | `P4-T1R7` completion |
| `backend/src/controllers/domains/operations/index.ts` | `@modules/*` route/controllers | Legacy operations-domain adapter exports for payments/export/publishing/reconciliation/templates. | `P4-T1R7` completion |
| `backend/src/controllers/domains/index.ts` | `backend/src/controllers/paymentController.ts` / module contracts | Historical export hub for legacy payment bootstrap path. | `P4-T1R7` completion |
| `backend/src/routes/payments.ts` | `@modules/payments` via `createPaymentsRoutes` | Legacy v1 route mount compatibility (kept for legacy endpoint surface). | `P4-T1R7` completion |
| `frontend/src/features/builder/state/index.ts` | `frontend/src/features/builder/state/templateCore.ts` | Route-mounted builder pages share compatibility state facade for `state` imports while feature pages migrate. | `2026-06-30` |
| `frontend/src/features/finance/state/donations.ts` | `frontend/src/features/finance/state/donationsCore.ts` | Compatibility state export retained as legacy re-export for feature routes and deferred consumer migration. | `2026-06-30` |
| `frontend/src/features/finance/state/payments.ts` | `frontend/src/features/finance/state/paymentsCore.ts` | Compatibility state export retained as legacy re-export for feature routes and deferred consumer migration. | `2026-06-30` |
| `frontend/src/features/finance/state/reconciliation.ts` | `frontend/src/features/finance/state/reconciliationCore.ts` | Compatibility state export retained as legacy re-export for feature routes and deferred consumer migration. | `2026-06-30` |
| `frontend/src/features/engagement/opportunities/state/index.ts` | `frontend/src/features/engagement/opportunities/state/opportunitiesCore.ts` | Compatibility state facade retained while route/page migration to core-owned selectors/actions completes. | `2026-06-30` |
| `frontend/src/features/finance/pages/DonationListPage.tsx` | `frontend/src/pages/finance/donations/DonationList.tsx` | Route-mounted page currently exposed through feature facade for route-boundary migration. | `2026-06-30` |
| `frontend/src/features/finance/pages/DonationDetailPage.tsx` | `frontend/src/pages/finance/donations/DonationDetail.tsx` | Route-mounted page currently exposed through feature facade for route-boundary migration. | `2026-06-30` |
| `frontend/src/features/finance/pages/DonationCreatePage.tsx` | `frontend/src/pages/finance/donations/DonationCreate.tsx` | Route-mounted page currently exposed through feature facade for route-boundary migration. | `2026-06-30` |
| `frontend/src/features/finance/pages/DonationEditPage.tsx` | `frontend/src/pages/finance/donations/DonationEdit.tsx` | Route-mounted page currently exposed through feature facade for route-boundary migration. | `2026-06-30` |
| `frontend/src/features/finance/pages/DonationPaymentPage.tsx` | `frontend/src/pages/finance/donations/DonationPayment.tsx` | Route-mounted page currently exposed through feature facade for route-boundary migration. | `2026-06-30` |
| `frontend/src/features/finance/pages/PaymentResultPage.tsx` | `frontend/src/pages/finance/donations/PaymentResult.tsx` | Route-mounted page currently exposed through feature facade for route-boundary migration. | `2026-06-30` |
| `frontend/src/features/finance/pages/ReconciliationDashboardPage.tsx` | `frontend/src/pages/finance/reconciliation/ReconciliationDashboard.tsx` | Route-mounted page currently exposed through feature facade for route-boundary migration. | `2026-06-30` |
| `frontend/src/features/engagement/cases/pages/ExternalServiceProvidersPage.tsx` | `frontend/src/pages/engagement/cases/ExternalServiceProviders.tsx` | Route-mounted page currently exposed through feature facade for route-boundary migration. | `2026-06-30` |
| `frontend/src/features/engagement/opportunities/pages/OpportunitiesPage.tsx` | `frontend/src/pages/engagement/opportunities/OpportunitiesPage.tsx` | Route-mounted page currently exposed through feature facade for route-boundary migration. | `2026-06-30` |

## Remediation notes

- Keep shim comments explicit with `@deprecated`, replacement target, and sunset note to preserve migration intent.
- Remove a shim only after all known importers migrate and policy gates are green for the affected domain.
