import { Router } from 'express';
import { z } from 'zod';
import { validateParams, validateQuery } from '@middleware/zodValidation';
import {
  downloadPublicReportByToken,
  getReportByPublicToken,
} from '../controllers/reportSharingController';

const router = Router();

const publicTokenParamsSchema = z.object({
  token: z.string().trim().min(1).max(255),
});

const publicDownloadQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']),
}).strict();

router.get('/:token', validateParams(publicTokenParamsSchema), getReportByPublicToken);
router.get(
  '/:token/download',
  validateParams(publicTokenParamsSchema),
  validateQuery(publicDownloadQuerySchema),
  downloadPublicReportByToken
);

export default router;

export const createPublicReportsRoutes = () => router;

export const publicReportsV2Routes = createPublicReportsRoutes();
