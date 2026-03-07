import { Router } from 'express';
import { createDashboardRoutes } from '@modules/dashboard';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/dashboard'));
router.use(createDashboardRoutes());

export default router;
