import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import {
  auditAnalyticsMiddleware,
  requireAccountAnalytics,
  requireAnomalyAccess,
  requireContactAnalytics,
  requireOrgAnalytics,
} from '@middleware/domains/security';
import { loadDataScope } from '@middleware/domains/data';
import { validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
import { createAnalyticsController } from '../controllers/analytics.controller';

const accountTypeSchema = z.enum(['organization', 'individual']);
const categorySchema = z.enum(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']);
const metricTypeSchema = z.enum(['donations', 'volunteer_hours', 'event_attendance']);

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO8601 date');

const analyticsSummaryQuerySchema = z.object({
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  account_type: accountTypeSchema.optional(),
  category: categorySchema.optional(),
}).strict();

const analyticsEntityIdParamsSchema = z.object({
  id: uuidSchema,
});

const trendMonthsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional(),
}).strict();

const comparativeQuerySchema = z.object({
  period: z.enum(['month', 'quarter', 'year']).optional(),
}).strict();

const trendMetricParamsSchema = z.object({
  metricType: metricTypeSchema,
});

const trendMetricQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(36).optional(),
}).strict();

const anomalyMetricQuerySchema = z.object({
  months: z.coerce.number().int().min(3).max(36).optional(),
  sensitivity: z.coerce.number().min(1).max(4).optional(),
}).strict();

export const createAnalyticsRoutes = (): Router => {
  const router = Router();
  const controller = createAnalyticsController();

  router.use(authenticate);
  router.use(loadDataScope('analytics'));

  router.get(
    '/summary',
    validateQuery(analyticsSummaryQuerySchema),
    requireOrgAnalytics,
    auditAnalyticsMiddleware('view_org_analytics'),
    controller.getAnalyticsSummary
  );

  router.get(
    '/accounts/:id',
    validateParams(analyticsEntityIdParamsSchema),
    requireAccountAnalytics,
    auditAnalyticsMiddleware('view_account_analytics'),
    controller.getAccountAnalytics
  );

  router.get(
    '/accounts/:id/donations',
    validateParams(analyticsEntityIdParamsSchema),
    requireAccountAnalytics,
    auditAnalyticsMiddleware('view_account_donations'),
    controller.getAccountDonationMetrics
  );

  router.get(
    '/accounts/:id/events',
    validateParams(analyticsEntityIdParamsSchema),
    requireAccountAnalytics,
    auditAnalyticsMiddleware('view_account_events'),
    controller.getAccountEventMetrics
  );

  router.get(
    '/contacts/:id',
    validateParams(analyticsEntityIdParamsSchema),
    requireContactAnalytics,
    auditAnalyticsMiddleware('view_contact_analytics'),
    controller.getContactAnalytics
  );

  router.get(
    '/contacts/:id/donations',
    validateParams(analyticsEntityIdParamsSchema),
    requireContactAnalytics,
    auditAnalyticsMiddleware('view_contact_donations'),
    controller.getContactDonationMetrics
  );

  router.get(
    '/contacts/:id/events',
    validateParams(analyticsEntityIdParamsSchema),
    requireContactAnalytics,
    auditAnalyticsMiddleware('view_contact_events'),
    controller.getContactEventMetrics
  );

  router.get(
    '/contacts/:id/volunteer',
    validateParams(analyticsEntityIdParamsSchema),
    requireContactAnalytics,
    auditAnalyticsMiddleware('view_volunteer_metrics'),
    controller.getContactVolunteerMetrics
  );

  router.get(
    '/trends/donations',
    validateQuery(trendMonthsQuerySchema),
    requireOrgAnalytics,
    auditAnalyticsMiddleware('view_donation_trends'),
    controller.getDonationTrends
  );

  router.get(
    '/trends/volunteer-hours',
    validateQuery(trendMonthsQuerySchema),
    requireOrgAnalytics,
    auditAnalyticsMiddleware('view_volunteer_trends'),
    controller.getVolunteerHoursTrends
  );

  router.get(
    '/trends/event-attendance',
    validateQuery(trendMonthsQuerySchema),
    requireOrgAnalytics,
    auditAnalyticsMiddleware('view_event_trends'),
    controller.getEventAttendanceTrends
  );

  router.get(
    '/comparative',
    validateQuery(comparativeQuerySchema),
    requireOrgAnalytics,
    auditAnalyticsMiddleware('view_comparative_analytics'),
    controller.getComparativeAnalytics
  );

  router.get(
    '/trends/:metricType',
    validateParams(trendMetricParamsSchema),
    validateQuery(trendMetricQuerySchema),
    requireOrgAnalytics,
    auditAnalyticsMiddleware('view_trend_analysis'),
    controller.getTrendAnalysis
  );

  router.get(
    '/anomalies/:metricType',
    validateParams(trendMetricParamsSchema),
    validateQuery(anomalyMetricQuerySchema),
    requireAnomalyAccess,
    auditAnalyticsMiddleware('view_anomaly_detection'),
    controller.detectAnomalies
  );

  return router;
};

export const analyticsV2Routes = createAnalyticsRoutes();
