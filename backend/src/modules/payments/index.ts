/**
 * MODULE-OWNERSHIP: payments
 *
 * Canonical module boundary:
 * - Controllers: `backend/src/modules/payments/controllers/paymentController.ts`
 * - Routes: `backend/src/modules/payments/routes/index.ts`
 *
 * Compatibility policy:
 * - `backend/src/routes/payments.ts` stays as a legacy v1 shim while migration is in flight.
 * - `backend/src/controllers/paymentController.ts` stays as a legacy re-export shim for
 *   bootstrap/tests until direct module imports are complete.
 *
 * Removed when P4-T1R7 migration blockers close.
 */

export * from './controllers';
export * from './routes';
