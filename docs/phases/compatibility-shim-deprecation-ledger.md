# Compatibility Shim Deprecation Ledger

**Last updated:** March 13, 2026

This ledger tracks shims retained for wave-safe compatibility and their planned retirement.

| Shim file | Canonical replacement | Why kept | Sunset target |
| --- | --- | --- | --- |
| `backend/src/controllers/paymentController.ts` | `backend/src/modules/payments/controllers/paymentController.ts` | Legacy callers still import `@controllers/paymentController`; module contract now owns behavior. | `P4-T1R7` completion |
| `backend/src/controllers/domains/operations/index.ts` | `@modules/*` route/controllers | Legacy operations-domain adapter exports for payments/export/publishing/reconciliation/templates. | `P4-T1R7` completion |
| `backend/src/controllers/domains/index.ts` | `backend/src/controllers/paymentController.ts` / module contracts | Historical export hub for legacy payment bootstrap path. | `P4-T1R7` completion |
| `backend/src/routes/payments.ts` | `@modules/payments` via `createPaymentsRoutes` | Legacy v1 route mount compatibility (kept for legacy endpoint surface). | `P4-T1R7` completion |
| `frontend/src/pages/builder/PageEditor.tsx` | `frontend/src/features/builder/pages/PageEditorPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after builder route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/builder/TemplateGallery.tsx` | `frontend/src/features/builder/pages/TemplateGalleryPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after builder route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/builder/TemplatePreview.tsx` | `frontend/src/features/builder/pages/TemplatePreviewPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after builder route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/finance/donations/DonationList.tsx` | `frontend/src/features/finance/pages/DonationListPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after finance route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/finance/donations/DonationDetail.tsx` | `frontend/src/features/finance/pages/DonationDetailPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after finance route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/finance/donations/DonationCreate.tsx` | `frontend/src/features/finance/pages/DonationCreatePage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after finance route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/finance/donations/DonationEdit.tsx` | `frontend/src/features/finance/pages/DonationEditPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after finance route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/finance/donations/DonationPayment.tsx` | `frontend/src/features/finance/pages/DonationPaymentPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after finance route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/finance/donations/PaymentResult.tsx` | `frontend/src/features/finance/pages/PaymentResultPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after finance route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/finance/reconciliation/ReconciliationDashboard.tsx` | `frontend/src/features/finance/pages/ReconciliationDashboardPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after finance route ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/engagement/cases/ExternalServiceProviders.tsx` | `frontend/src/features/engagement/cases/pages/ExternalServiceProvidersPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after external-service-provider ownership moved into the feature package. | `2026-06-30` |
| `frontend/src/pages/engagement/opportunities/OpportunitiesPage.tsx` | `frontend/src/features/engagement/opportunities/pages/OpportunitiesPage.tsx` | Legacy page-path wrapper retained so compatibility imports continue resolving after opportunities route ownership moved into the feature package. | `2026-06-30` |

## Remediation notes

- Keep shim comments explicit with `@deprecated`, replacement target, and sunset note to preserve migration intent.
- Remove a shim only after all known importers migrate and policy gates are green for the affected domain.
