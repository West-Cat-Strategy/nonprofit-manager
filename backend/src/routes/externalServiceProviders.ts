/**
 * @deprecated Compatibility shim for legacy v1 route entrypoint.
 * Module-owned controller/service behavior is implemented in backend/src/modules/*.
 * Keep this module as a compatibility bridge while legacy endpoints remain supported.
 *
 */

import { createExternalServiceProvidersRoutes } from '@modules/externalServiceProviders';

const router = createExternalServiceProvidersRoutes('legacy');

export default router;
