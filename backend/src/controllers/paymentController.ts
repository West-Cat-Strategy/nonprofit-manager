/**
 * MODULE-OWNERSHIP: payments (compatibility shim)
 *
 * What replaced:
 * - `backend/src/modules/payments/controllers/paymentController.ts`
 *
 * Why kept:
 * - Legacy bootstrap/tests still import `@controllers/paymentController` directly.
 *
 * Sunset target:
 * - P4-T1R7 / 2026-06-30 or earlier once all importers migrate to module contracts.
 *
 * Source of truth:
 * - Controllers: `backend/src/modules/payments/controllers/paymentController.ts`
 * - Route entrypoints: `backend/src/modules/payments/routes/index.ts`
 *
 * @deprecated Use `@modules/payments/controllers/paymentController` directly.
 */

export * from '@modules/payments/controllers/paymentController';
