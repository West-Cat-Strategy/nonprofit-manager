import { Router } from 'express';
import { eventsV2Routes } from '@modules/events';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/events'));
router.use(eventsV2Routes);

export default router;
