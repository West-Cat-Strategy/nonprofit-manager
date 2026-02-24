/**
 * Backup Routes
 * Admin-only API routes for exporting full data backups.
 */

import { Router } from 'express';
import { z } from 'zod';
import { exportBackup } from '@controllers/domains/core';
import { authenticate, authorize } from '@middleware/domains/auth';
import { validateBody } from '@middleware/zodValidation';

const router = Router();

const backupExportSchema = z.object({
  filename: z.string().optional(),
  include_secrets: z.coerce.boolean().optional(),
  compress: z.coerce.boolean().optional(),
});

router.use(authenticate);
router.use(authorize('admin'));

router.post('/export', validateBody(backupExportSchema), exportBackup);

export default router;
