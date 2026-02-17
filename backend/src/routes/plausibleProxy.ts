import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '@middleware/domains/auth';
import { logger } from '@config/logger';

const router = Router();

/**
 * GET /api/plausible/stats/aggregate
 * Proxy to Plausible Analytics API
 * Requires authentication and admin/manager role
 */
router.get(
  '/stats/aggregate',
  authenticate,
  authorize('admin', 'manager'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = process.env.PLAUSIBLE_API_KEY;
      const apiHost = process.env.PLAUSIBLE_API_HOST || 'https://plausible.io';
      const domain = process.env.PLAUSIBLE_DOMAIN;

      if (!apiKey || !domain) {
        logger.warn('Plausible API not configured');
        res.status(503).json({ error: 'Analytics service not configured' });
        return;
      }

      // Build query params from request
      const period = (req.query.period as string) || '30d';
      const metrics = (req.query.metrics as string) || 'visitors,pageviews,bounce_rate,visit_duration';
      const compare = (req.query.compare as string) || 'previous_period';

      const url = new URL(`${apiHost}/api/v1/stats/aggregate`);
      url.searchParams.set('site_id', domain);
      url.searchParams.set('period', period);
      url.searchParams.set('metrics', metrics);
      if (compare) {
        url.searchParams.set('compare', compare);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Plausible API error', { status: response.status, error: errorText });
        res.status(response.status).json({ error: 'Failed to fetch analytics data' });
        return;
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      logger.error('Plausible proxy error', { error });
      next(error);
    }
  }
);

export default router;
