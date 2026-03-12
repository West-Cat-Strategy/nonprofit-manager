/**
 * MODULE-OWNERSHIP: payments route shim (legacy v1)
 *
 * What replaced:
 * - Direct legacy route handler exports in `backend/src/routes/payments.ts`.
 *
 * Why kept:
 * - Preserve stable `/api/payments` entrypoint behavior while legacy callers and
 *   policy baselines migrate to module entrypoint wiring.
 *
 * Sunset target:
 * - P4-T1R7 / 2026-06-30.
 *
 * @deprecated Compatibility shim for legacy v1 route entrypoint.
 * Canonical route wiring is owned by `backend/src/modules/payments/routes/index.ts`.
 * Keep this module as a compatibility bridge while legacy callers are transitioned.
 */

import { createPaymentsRoutes } from '@modules/payments';

const router = createPaymentsRoutes('legacy');

export default router;
