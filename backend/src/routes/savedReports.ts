import { Router } from 'express';
import { createSavedReportsRoutes } from '@modules/savedReports';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/saved-reports'));
router.use(createSavedReportsRoutes());

export default router;
