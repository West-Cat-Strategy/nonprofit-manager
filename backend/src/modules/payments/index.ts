/**
 * MODULE-OWNERSHIP: payments
 *
 * Canonical module boundary:
 * - Controllers: `backend/src/modules/payments/controllers/paymentController.ts`
 * - Routes: `backend/src/modules/payments/routes/index.ts`
 *
 * Compatibility policy:
 * - Legacy `/api/payments/*` requests are served by the central tombstone layer.
 * - No root `backend/src/routes/payments.ts` shim remains in the current tree.
 * - Controller/domain payment re-export shims were retired in `P4-T1R7` after importer cleanup.
 *
 * Removed when P4-T1R7 migration blockers close.
 */

export * from './controllers';
export * from './routes';
