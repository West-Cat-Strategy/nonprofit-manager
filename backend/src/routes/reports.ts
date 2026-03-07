import { Router } from 'express';
import { createReportsRoutes } from '@modules/reports';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/reports'));
router.use(createReportsRoutes());

export default router;
