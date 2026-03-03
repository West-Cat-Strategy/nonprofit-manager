import { Router } from 'express';
import { createTasksRoutes } from '@modules/tasks';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/tasks'));
router.use(createTasksRoutes('legacy'));

export default router;
