/**
 * MODULE-OWNERSHIP: external service providers route-owned page facade
 *
 * Legacy facade for compatibility mounts while route-mounted ownership is
 * consolidated into the feature module migration flow.
 *
 * Replaces legacy mount path:
 * - `frontend/src/pages/engagement/cases/ExternalServiceProviders.tsx`
 *
 * Kept temporarily for migration safety under `P4-T1R7` with sunset target
 * 2026-06-30 or until direct feature-owned ownership migration is complete.
 *
 * @deprecated Route consumers should migrate to a feature-owned page implementation.
 */

export { default } from '../../../../pages/engagement/cases/ExternalServiceProviders';
