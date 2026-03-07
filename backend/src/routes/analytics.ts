import { Router } from 'express';
import { createAnalyticsRoutes } from '@modules/analytics';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/analytics'));
router.use(createAnalyticsRoutes());

export default router;
