export * as coreControllers from './core';
export * as engagementControllers from './engagement';
export * as operationsControllers from './operations';
export * as portalControllers from './portal';

/**
 * MODULE-OWNERSHIP: payments bootstrap compatibility
 *
 * `setPaymentPool` is owned by `@modules/payments/controllers/paymentController`.
 * This legacy export remains for bootstrap consumers that still import
 * through `@controllers/domains`.
 *
 * What replaced:
 * - `setPaymentPool` now belongs to `backend/src/modules/payments/controllers/paymentController.ts`.
 *
 * Why kept:
 * - Keeps legacy bootstrap/test call sites stable while route/controller migration is in progress.
 *
 * Sunset target:
 * - P4-T1R7 / 2026-06-30.
 *
 * @deprecated Use `@modules/payments` compatibility export directly.
 */
export { setPaymentPool } from './operations';
