/**
 * MODULE-OWNERSHIP: finance feature state facade
 *
 * Source of truth:
 * - `frontend/src/features/finance/state/reconciliationCore.ts`
 *
 * What replaced:
 * - `frontend/src/features/finance/state/reconciliationCore.ts`
 *
 * Why kept:
 * - Legacy feature consumers still importing `features/finance/state` during migration.
 *
 * Sunset target:
 * - 2026-06-30 (P4-T1R7).
 *
 * @deprecated Compatibility shim; migrate feature consumers to `./reconciliationCore`.
 */

export { default as reconciliationReducer } from './reconciliationCore';
export * from './reconciliationCore';
