/**
 * @deprecated Compatibility shim for legacy v1 route entrypoint.
 * Module-owned controller/service behavior is implemented in backend/src/modules/*.
 * Keep this module as a compatibility bridge while legacy endpoints remain supported.
 *
 */

import { createDonationsRoutes } from '@modules/donations';

const router = createDonationsRoutes('legacy');

export default router;
