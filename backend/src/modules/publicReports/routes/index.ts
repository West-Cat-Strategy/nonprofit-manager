import { Router, type Request, type Response } from 'express';
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

const publicDownloadQuerySchema = z
  .object({
    format: z.enum(['csv', 'xlsx']),
  })
  .strict();

const legacyPathTokenDisabled = (_req: Request, res: Response): void => {
  res.status(410).json({
    success: false,
    error: {
      code: 'legacy_token_path_disabled',
      message: 'Public report path-token access is no longer supported. Use a Bearer token from a fragment-based public link.',
    },
  });
};

router.get('/', publicReportTokenLimiterMiddleware, getReportByPublicToken);
router.get(
  '/download',
  publicReportTokenLimiterMiddleware,
  validateQuery(publicDownloadQuerySchema),
  downloadPublicReportByToken
);
router.get(
  '/:token',
  publicReportTokenLimiterMiddleware,
  validateParams(publicTokenParamsSchema),
  legacyPathTokenDisabled
);
router.get(
  '/:token/download',
  publicReportTokenLimiterMiddleware,
  validateParams(publicTokenParamsSchema),
  validateQuery(publicDownloadQuerySchema),
  legacyPathTokenDisabled
);

export default router;

export const createPublicReportsRoutes = () => router;

export const publicReportsV2Routes = createPublicReportsRoutes();
