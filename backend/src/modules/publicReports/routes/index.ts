import { Router } from 'express';
import { z } from 'zod';
import { validateParams, validateQuery } from '@middleware/zodValidation';
import { publicReportTokenLimiterMiddleware } from '@middleware/domains/platform';
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

router.get(
  '/:token',
  publicReportTokenLimiterMiddleware,
  validateParams(publicTokenParamsSchema),
  getReportByPublicToken
);
router.get(
  '/:token/download',
  publicReportTokenLimiterMiddleware,
  validateParams(publicTokenParamsSchema),
  validateQuery(publicDownloadQuerySchema),
  downloadPublicReportByToken
);

export default router;

export const createPublicReportsRoutes = () => router;

export const publicReportsV2Routes = createPublicReportsRoutes();
