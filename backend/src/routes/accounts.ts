import { Router } from 'express';
import { createAccountsRoutes } from '@modules/accounts';
import { v1DeprecationHeaders } from '@middleware/domains/platform/v1Deprecation';

const router = Router();

router.use(v1DeprecationHeaders('/api/v2/accounts'));
router.use(createAccountsRoutes('legacy'));

export default router;
