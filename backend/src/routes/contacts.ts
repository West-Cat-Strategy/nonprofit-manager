import { Router } from 'express';
import { createContactsRoutes } from '@modules/contacts';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/contacts'));
router.use(createContactsRoutes('legacy'));

export default router;
