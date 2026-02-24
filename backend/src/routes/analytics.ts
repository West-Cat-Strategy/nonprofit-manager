/**
 * Analytics Routes
 * API routes for constituent analytics
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  getAccountAnalytics,
  getContactAnalytics,
  getAnalyticsSummary,
  getAccountDonationMetrics,
  getContactDonationMetrics,
  getAccountEventMetrics,
  getContactEventMetrics,
  getContactVolunteerMetrics,
  getDonationTrends,
  getVolunteerHoursTrends,
  getEventAttendanceTrends,
  getComparativeAnalytics,
  getTrendAnalysis,
  detectAnomalies,
} from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import {
  requireOrgAnalytics,
  requireAccountAnalytics,
  requireContactAnalytics,
  requireAnomalyAccess,
  auditAnalyticsMiddleware,
} from '@middleware/domains/security';
import { loadDataScope } from '@middleware/domains/data';
import { validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';

const router = Router();

const accountTypeSchema = z.enum(['organization', 'individual']);
const categorySchema = z.enum(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']);
const metricTypeSchema = z.enum(['donations', 'volunteer_hours', 'event_attendance']);

const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO8601 date');

const analyticsSummaryQuerySchema = z.object({
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  account_type: accountTypeSchema.optional(),
  category: categorySchema.optional(),
});

const analyticsEntityIdParamsSchema = z.object({
  id: uuidSchema,
});

const trendMonthsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional(),
});

const comparativeQuerySchema = z.object({
  period: z.enum(['month', 'quarter', 'year']).optional(),
});

const trendMetricParamsSchema = z.object({
  metricType: metricTypeSchema,
});

const trendMetricQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(36).optional(),
});

const anomalyMetricQuerySchema = z.object({
  months: z.coerce.number().int().min(3).max(36).optional(),
  sensitivity: z.coerce.number().min(1).max(4).optional(),
});

// All routes require authentication
router.use(authenticate);
router.use(loadDataScope('analytics'));

/**
 * GET /api/analytics/summary
 * Get organization-wide analytics summary
 */
router.get(
  '/summary',
  validateQuery(analyticsSummaryQuerySchema),
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_org_analytics'),
  getAnalyticsSummary
);

/**
 * GET /api/analytics/accounts/:id
 * Get full analytics for an account
 */
router.get(
  '/accounts/:id',
  validateParams(analyticsEntityIdParamsSchema),
  requireAccountAnalytics,
  auditAnalyticsMiddleware('view_account_analytics'),
  getAccountAnalytics
);

/**
 * GET /api/analytics/accounts/:id/donations
 * Get donation metrics for an account
 */
router.get(
  '/accounts/:id/donations',
  validateParams(analyticsEntityIdParamsSchema),
  requireAccountAnalytics,
  auditAnalyticsMiddleware('view_account_donations'),
  getAccountDonationMetrics
);

/**
 * GET /api/analytics/accounts/:id/events
 * Get event metrics for an account
 */
router.get(
  '/accounts/:id/events',
  validateParams(analyticsEntityIdParamsSchema),
  requireAccountAnalytics,
  auditAnalyticsMiddleware('view_account_events'),
  getAccountEventMetrics
);

/**
 * GET /api/analytics/contacts/:id
 * Get full analytics for a contact
 */
router.get(
  '/contacts/:id',
  validateParams(analyticsEntityIdParamsSchema),
  requireContactAnalytics,
  auditAnalyticsMiddleware('view_contact_analytics'),
  getContactAnalytics
);

/**
 * GET /api/analytics/contacts/:id/donations
 * Get donation metrics for a contact
 */
router.get(
  '/contacts/:id/donations',
  validateParams(analyticsEntityIdParamsSchema),
  requireContactAnalytics,
  auditAnalyticsMiddleware('view_contact_donations'),
  getContactDonationMetrics
);

/**
 * GET /api/analytics/contacts/:id/events
 * Get event metrics for a contact
 */
router.get(
  '/contacts/:id/events',
  validateParams(analyticsEntityIdParamsSchema),
  requireContactAnalytics,
  auditAnalyticsMiddleware('view_contact_events'),
  getContactEventMetrics
);

/**
 * GET /api/analytics/contacts/:id/volunteer
 * Get volunteer metrics for a contact
 */
router.get(
  '/contacts/:id/volunteer',
  validateParams(analyticsEntityIdParamsSchema),
  requireContactAnalytics,
  auditAnalyticsMiddleware('view_volunteer_metrics'),
  getContactVolunteerMetrics
);

/**
 * GET /api/analytics/trends/donations
 * Get donation trends over time (monthly)
 */
router.get(
  '/trends/donations',
  validateQuery(trendMonthsQuerySchema),
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_donation_trends'),
  getDonationTrends
);

/**
 * GET /api/analytics/trends/volunteer-hours
 * Get volunteer hours trends over time (monthly)
 */
router.get(
  '/trends/volunteer-hours',
  validateQuery(trendMonthsQuerySchema),
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_volunteer_trends'),
  getVolunteerHoursTrends
);

/**
 * GET /api/analytics/trends/event-attendance
 * Get event attendance trends over time (monthly)
 */
router.get(
  '/trends/event-attendance',
  validateQuery(trendMonthsQuerySchema),
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_event_trends'),
  getEventAttendanceTrends
);

/**
 * GET /api/analytics/comparative
 * Get comparative analytics (YoY, MoM, QoQ)
 */
router.get(
  '/comparative',
  validateQuery(comparativeQuerySchema),
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_comparative_analytics'),
  getComparativeAnalytics
);

/**
 * GET /api/analytics/trends/:metricType
 * Get trend analysis with moving averages
 * Supported metric types: donations, volunteer_hours, event_attendance
 */
router.get(
  '/trends/:metricType',
  validateParams(trendMetricParamsSchema),
  validateQuery(trendMetricQuerySchema),
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_trend_analysis'),
  getTrendAnalysis
);

/**
 * GET /api/analytics/anomalies/:metricType
 * Detect anomalies using statistical analysis
 * Supported metric types: donations, volunteer_hours, event_attendance
 */
router.get(
  '/anomalies/:metricType',
  validateParams(trendMetricParamsSchema),
  validateQuery(anomalyMetricQuerySchema),
  requireAnomalyAccess,
  auditAnalyticsMiddleware('view_anomaly_detection'),
  detectAnomalies
);

export default router;
