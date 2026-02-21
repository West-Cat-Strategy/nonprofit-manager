import { Router } from 'express';
import { createCasesRoutes } from '@modules/cases';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/cases'));
router.use(createCasesRoutes('legacy'));

export default router;
