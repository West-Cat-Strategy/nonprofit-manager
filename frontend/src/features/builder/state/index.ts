/**
 * MODULE-OWNERSHIP: builder feature state facade
 *
 * Source of truth for feature-owned builder state and thunks:
 * - `frontend/src/features/builder/state/templateCore.ts`
 *
 * What replaced:
 * - `frontend/src/features/builder/state/templateCore.ts`
 *
 * Why kept:
 * - Legacy feature consumers still importing `features/builder/state` during
 *   route/state migration.
 *
 * Sunset target:
 * - P4-T1R7 / 2026-06-30.
 *
 * @deprecated Use `./templateCore` exports directly.
 */

export { default as templateReducer } from './templateCore';
export * from './templateCore';
