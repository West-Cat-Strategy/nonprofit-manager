/**
 * MODULE-OWNERSHIP: opportunities feature state facade
 *
 * Source of truth:
 * - `frontend/src/features/engagement/opportunities/state/opportunitiesCore.ts`
 *
 * What replaced:
 * - `frontend/src/features/engagement/opportunities/state/opportunitiesCore.ts`
 *
 * Why kept:
 * - Legacy feature consumers still importing `features/engagement/opportunities/state`
 *   while route and page ownership migrates.
 *
 * Sunset target:
 * - 2026-06-30 (P4-T1R7).
 *
 * @deprecated Compatibility shim; migrate feature consumers to `./opportunitiesCore`.
 */

export { default as opportunitiesReducer } from './opportunitiesCore';
export * from './opportunitiesCore';
