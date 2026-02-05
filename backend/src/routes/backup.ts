/**
 * Backup Routes
 * Admin-only API routes for exporting full data backups.
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { exportBackup } from '../controllers/backupController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.post(
  '/export',
  [
    body('filename').optional().isString(),
    body('include_secrets').optional().isBoolean(),
    body('compress').optional().isBoolean(),
  ],
  validateRequest,
  exportBackup
);

export default router;
