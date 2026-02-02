/**
 * Analytics Routes
 * API routes for constituent analytics
 */

import { Router } from 'express';
import { param, query } from 'express-validator';
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
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';
import {
  requireOrgAnalytics,
  requireAccountAnalytics,
  requireContactAnalytics,
  requireAnomalyAccess,
  auditAnalyticsMiddleware,
} from '../middleware/analyticsAuth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/analytics/summary
 * Get organization-wide analytics summary
 */
router.get(
  '/summary',
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_org_analytics'),
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('account_type').optional().isIn(['organization', 'individual']),
    query('category')
      .optional()
      .isIn(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']),
  ],
  getAnalyticsSummary
);

/**
 * GET /api/analytics/accounts/:id
 * Get full analytics for an account
 */
router.get(
  '/accounts/:id',
  requireAccountAnalytics,
  auditAnalyticsMiddleware('view_account_analytics'),
  [param('id').isUUID()],
  getAccountAnalytics
);

/**
 * GET /api/analytics/accounts/:id/donations
 * Get donation metrics for an account
 */
router.get(
  '/accounts/:id/donations',
  requireAccountAnalytics,
  auditAnalyticsMiddleware('view_account_donations'),
  [param('id').isUUID()],
  getAccountDonationMetrics
);

/**
 * GET /api/analytics/accounts/:id/events
 * Get event metrics for an account
 */
router.get(
  '/accounts/:id/events',
  requireAccountAnalytics,
  auditAnalyticsMiddleware('view_account_events'),
  [param('id').isUUID()],
  getAccountEventMetrics
);

/**
 * GET /api/analytics/contacts/:id
 * Get full analytics for a contact
 */
router.get(
  '/contacts/:id',
  requireContactAnalytics,
  auditAnalyticsMiddleware('view_contact_analytics'),
  [param('id').isUUID()],
  getContactAnalytics
);

/**
 * GET /api/analytics/contacts/:id/donations
 * Get donation metrics for a contact
 */
router.get(
  '/contacts/:id/donations',
  requireContactAnalytics,
  auditAnalyticsMiddleware('view_contact_donations'),
  [param('id').isUUID()],
  getContactDonationMetrics
);

/**
 * GET /api/analytics/contacts/:id/events
 * Get event metrics for a contact
 */
router.get(
  '/contacts/:id/events',
  requireContactAnalytics,
  auditAnalyticsMiddleware('view_contact_events'),
  [param('id').isUUID()],
  getContactEventMetrics
);

/**
 * GET /api/analytics/contacts/:id/volunteer
 * Get volunteer metrics for a contact
 */
router.get(
  '/contacts/:id/volunteer',
  requireContactAnalytics,
  auditAnalyticsMiddleware('view_volunteer_metrics'),
  [param('id').isUUID()],
  getContactVolunteerMetrics
);

/**
 * GET /api/analytics/trends/donations
 * Get donation trends over time (monthly)
 */
router.get(
  '/trends/donations',
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_donation_trends'),
  [query('months').optional().isInt({ min: 1, max: 24 })],
  getDonationTrends
);

/**
 * GET /api/analytics/trends/volunteer-hours
 * Get volunteer hours trends over time (monthly)
 */
router.get(
  '/trends/volunteer-hours',
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_volunteer_trends'),
  [query('months').optional().isInt({ min: 1, max: 24 })],
  getVolunteerHoursTrends
);

/**
 * GET /api/analytics/trends/event-attendance
 * Get event attendance trends over time (monthly)
 */
router.get(
  '/trends/event-attendance',
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_event_trends'),
  [query('months').optional().isInt({ min: 1, max: 24 })],
  getEventAttendanceTrends
);

/**
 * GET /api/analytics/comparative
 * Get comparative analytics (YoY, MoM, QoQ)
 */
router.get(
  '/comparative',
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_comparative_analytics'),
  [query('period').optional().isIn(['month', 'quarter', 'year'])],
  getComparativeAnalytics
);

/**
 * GET /api/analytics/trends/:metricType
 * Get trend analysis with moving averages
 * Supported metric types: donations, volunteer_hours, event_attendance
 */
router.get(
  '/trends/:metricType',
  requireOrgAnalytics,
  auditAnalyticsMiddleware('view_trend_analysis'),
  [
    param('metricType').isIn(['donations', 'volunteer_hours', 'event_attendance']),
    query('months').optional().isInt({ min: 1, max: 36 }),
  ],
  getTrendAnalysis
);

/**
 * GET /api/analytics/anomalies/:metricType
 * Detect anomalies using statistical analysis
 * Supported metric types: donations, volunteer_hours, event_attendance
 */
router.get(
  '/anomalies/:metricType',
  requireAnomalyAccess,
  auditAnalyticsMiddleware('view_anomaly_detection'),
  [
    param('metricType').isIn(['donations', 'volunteer_hours', 'event_attendance']),
    query('months').optional().isInt({ min: 3, max: 36 }),
    query('sensitivity').optional().isFloat({ min: 1.0, max: 4.0 }),
  ],
  detectAnomalies
);

export default router;
