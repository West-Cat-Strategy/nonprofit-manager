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
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/analytics/summary
 * Get organization-wide analytics summary
 */
router.get(
  '/summary',
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('account_type').optional().isIn(['organization', 'individual']),
    query('category')
      .optional()
      .isIn(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']),
  ],
  handleValidationErrors,
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
  [param('id').isUUID()],
  handleValidationErrors,
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
  [param('id').isUUID()],
  handleValidationErrors,
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
  [param('id').isUUID()],
  handleValidationErrors,
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
  [param('id').isUUID()],
  handleValidationErrors,
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
  [param('id').isUUID()],
  handleValidationErrors,
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
  [param('id').isUUID()],
  handleValidationErrors,
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
  [param('id').isUUID()],
  handleValidationErrors,
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
  [query('months').optional().isInt({ min: 1, max: 24 })],
  handleValidationErrors,
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
  [query('months').optional().isInt({ min: 1, max: 24 })],
  handleValidationErrors,
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
  [query('months').optional().isInt({ min: 1, max: 24 })],
  handleValidationErrors,
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
  [query('period').optional().isIn(['month', 'quarter', 'year'])],
  handleValidationErrors,
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
  [
    param('metricType').isIn(['donations', 'volunteer_hours', 'event_attendance']),
    query('months').optional().isInt({ min: 1, max: 36 }),
  ],
  handleValidationErrors,
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
  [
    param('metricType').isIn(['donations', 'volunteer_hours', 'event_attendance']),
    query('months').optional().isInt({ min: 3, max: 36 }),
    query('sensitivity').optional().isFloat({ min: 1.0, max: 4.0 }),
  ],
  handleValidationErrors,
  requireAnomalyAccess,
  auditAnalyticsMiddleware('view_anomaly_detection'),
  detectAnomalies
);

export default router;
