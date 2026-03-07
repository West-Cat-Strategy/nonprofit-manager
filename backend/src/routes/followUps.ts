import { Router } from 'express';
import { createFollowUpsRoutes } from '@modules/followUps';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/follow-ups'));
router.use(createFollowUpsRoutes());

export default router;
