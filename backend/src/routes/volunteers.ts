import { Router } from 'express';
import { createVolunteersRoutes } from '@modules/volunteers';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/volunteers'));
router.use(createVolunteersRoutes('legacy'));

export default router;
