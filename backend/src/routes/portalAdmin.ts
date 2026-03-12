/**
 * @deprecated Compatibility shim for legacy v1 route entrypoint.
 * Module-owned controller/service behavior is implemented in backend/src/modules/*.
 * Keep this module as a compatibility bridge while legacy endpoints remain supported.
 *
 */

import { createPortalAdminRoutes } from '@modules/portalAdmin';

const router = createPortalAdminRoutes('legacy');

export default router;
