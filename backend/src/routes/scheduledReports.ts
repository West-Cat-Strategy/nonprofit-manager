import { Router } from 'express';
import { createScheduledReportsRoutes } from '@modules/scheduledReports';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/scheduled-reports'));
router.use(createScheduledReportsRoutes('legacy'));

export default router;
