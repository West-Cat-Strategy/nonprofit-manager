import express from 'express';
import { authenticate } from '@middleware/domains/auth';
import * as externalServiceProviderController from '@controllers/domains/engagement';

const router = express.Router();

router.get('/', authenticate, externalServiceProviderController.getExternalServiceProviders);
router.post('/', authenticate, externalServiceProviderController.createExternalServiceProvider);
router.put('/:id', authenticate, externalServiceProviderController.updateExternalServiceProvider);
router.delete('/:id', authenticate, externalServiceProviderController.deleteExternalServiceProvider);

export default router;
