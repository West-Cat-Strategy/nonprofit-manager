/**
 * MODULE-OWNERSHIP: operations compatibility layer
 *
 * Canonical implementations now live in module-owned controllers:
 * - `@modules/export/controllers/exportController`
 * - `@modules/publishing/controllers/publishingController`
 * - `@modules/reconciliation/controllers/reconciliationController`
 * - `@modules/templates/controllers/templateController`
 * - `@modules/payments/controllers/paymentController`
 *
 * What replaced:
 * - Legacy monolithic `operations` controller index.
 *
 * Why kept:
 * - Preserve legacy import shape for in-flight callers while migration completes.
 *
 * Sunset target:
 * - P4-T1R7 / 2026-06-30.
 *
 * @deprecated Remove compatibility indirection once all legacy imports are retired.
 */

export { setPaymentPool } from '@modules/payments/controllers/paymentController';
export * from '@modules/export/controllers/exportController';
export * from '@modules/publishing/controllers/publishingController';
export * from '@modules/reconciliation/controllers/reconciliationController';
export * from '@modules/templates/controllers/templateController';
