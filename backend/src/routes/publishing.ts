/**
 * @deprecated Compatibility shim for legacy v1 route entrypoint.
 * Module-owned controller/service behavior is implemented in backend/src/modules/*.
 * Keep this module as a compatibility bridge while legacy endpoints remain supported.
 *
 */

import { createPublishingRoutes } from '@modules/publishing';

const router = createPublishingRoutes('legacy');

export default router;
