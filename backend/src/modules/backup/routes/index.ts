/**
 * Backup Routes
 * Admin-only API routes for exporting full data backups.
 */

import { Router } from 'express';
import { z } from 'zod';
import { optionalStrictBooleanSchema } from '@validations/shared';
import { exportBackup } from '../controllers';
import { authenticate, authorize } from '@middleware/domains/auth';
import { validateBody } from '@middleware/zodValidation';

const router = Router();

const backupExportSchema = z.object({
  filename: z.string().optional(),
  include_secrets: optionalStrictBooleanSchema,
  compress: optionalStrictBooleanSchema,
});

router.use(authenticate);
router.use(authorize('admin'));

router.post('/export', validateBody(backupExportSchema), exportBackup);

export default router;

export type ResponseMode = 'v2' | 'legacy';

export const createBackupRoutes = (_mode: ResponseMode = 'v2') => router;

export const backupV2Routes = createBackupRoutes('v2');
