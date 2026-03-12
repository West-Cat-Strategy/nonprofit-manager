/**
 * MODULE-OWNERSHIP: finance feature state facade
 *
 * Source of truth:
 * - `frontend/src/features/finance/state/paymentsCore.ts`
 *
 * What replaced:
 * - `frontend/src/features/finance/state/paymentsCore.ts`
 *
 * Why kept:
 * - Legacy feature consumers still importing `features/finance/state` during migration.
 *
 * Sunset target:
 * - 2026-06-30 (P4-T1R7).
 *
 * @deprecated Compatibility shim; migrate feature consumers to `./paymentsCore`.
 */

export { default as paymentsReducer } from './paymentsCore';
export * from './paymentsCore';
