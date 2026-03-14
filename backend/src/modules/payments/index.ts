/**
 * MODULE-OWNERSHIP: payments
 *
 * Canonical module boundary:
 * - Controllers: `backend/src/modules/payments/controllers/paymentController.ts`
 * - Routes: `backend/src/modules/payments/routes/index.ts`
 *
 * Compatibility policy:
 * - `backend/src/routes/payments.ts` stays as a legacy v1 shim while migration is in flight.
 * - Controller/domain payment re-export shims were retired in `P4-T1R7` after importer cleanup.
 *
 * Removed when P4-T1R7 migration blockers close.
 */

export * from './controllers';
export * from './routes';
