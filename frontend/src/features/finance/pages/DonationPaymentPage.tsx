/**
 * MODULE-OWNERSHIP: finance route-mounted page facade
 *
 * Legacy facade for compatibility mounts while finance feature-owned page
 * ownership is maintained in legacy page wrappers.
 *
 * Replaces legacy mount path:
 * - `frontend/src/pages/finance/donations/DonationPayment.tsx`
 *
 * Kept temporarily for migration safety under `P4-T1R7` with sunset target
 * 2026-06-30 or until all finance consumers import feature-owned pages.
 *
 * @deprecated Route consumers should migrate to a feature-owned page implementation.
 */

export { default } from '../../../pages/finance/donations/DonationPayment';
