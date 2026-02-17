"use strict";
/**
 * Analytics Routes
 * API routes for constituent analytics
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const analyticsController_1 = require("../controllers/analyticsController");
const auth_1 = require("../middleware/auth");
const analyticsAuth_1 = require("../middleware/analyticsAuth");
const dataScope_1 = require("../middleware/dataScope");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use((0, dataScope_1.loadDataScope)('analytics'));
/**
 * GET /api/analytics/summary
 * Get organization-wide analytics summary
 */
router.get('/summary', [
    (0, express_validator_1.query)('start_date').optional().isISO8601(),
    (0, express_validator_1.query)('end_date').optional().isISO8601(),
    (0, express_validator_1.query)('account_type').optional().isIn(['organization', 'individual']),
    (0, express_validator_1.query)('category')
        .optional()
        .isIn(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']),
], validation_1.handleValidationErrors, analyticsAuth_1.requireOrgAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_org_analytics'), analyticsController_1.getAnalyticsSummary);
/**
 * GET /api/analytics/accounts/:id
 * Get full analytics for an account
 */
router.get('/accounts/:id', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, analyticsAuth_1.requireAccountAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_account_analytics'), analyticsController_1.getAccountAnalytics);
/**
 * GET /api/analytics/accounts/:id/donations
 * Get donation metrics for an account
 */
router.get('/accounts/:id/donations', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, analyticsAuth_1.requireAccountAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_account_donations'), analyticsController_1.getAccountDonationMetrics);
/**
 * GET /api/analytics/accounts/:id/events
 * Get event metrics for an account
 */
router.get('/accounts/:id/events', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, analyticsAuth_1.requireAccountAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_account_events'), analyticsController_1.getAccountEventMetrics);
/**
 * GET /api/analytics/contacts/:id
 * Get full analytics for a contact
 */
router.get('/contacts/:id', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, analyticsAuth_1.requireContactAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_contact_analytics'), analyticsController_1.getContactAnalytics);
/**
 * GET /api/analytics/contacts/:id/donations
 * Get donation metrics for a contact
 */
router.get('/contacts/:id/donations', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, analyticsAuth_1.requireContactAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_contact_donations'), analyticsController_1.getContactDonationMetrics);
/**
 * GET /api/analytics/contacts/:id/events
 * Get event metrics for a contact
 */
router.get('/contacts/:id/events', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, analyticsAuth_1.requireContactAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_contact_events'), analyticsController_1.getContactEventMetrics);
/**
 * GET /api/analytics/contacts/:id/volunteer
 * Get volunteer metrics for a contact
 */
router.get('/contacts/:id/volunteer', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, analyticsAuth_1.requireContactAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_volunteer_metrics'), analyticsController_1.getContactVolunteerMetrics);
/**
 * GET /api/analytics/trends/donations
 * Get donation trends over time (monthly)
 */
router.get('/trends/donations', [(0, express_validator_1.query)('months').optional().isInt({ min: 1, max: 24 })], validation_1.handleValidationErrors, analyticsAuth_1.requireOrgAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_donation_trends'), analyticsController_1.getDonationTrends);
/**
 * GET /api/analytics/trends/volunteer-hours
 * Get volunteer hours trends over time (monthly)
 */
router.get('/trends/volunteer-hours', [(0, express_validator_1.query)('months').optional().isInt({ min: 1, max: 24 })], validation_1.handleValidationErrors, analyticsAuth_1.requireOrgAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_volunteer_trends'), analyticsController_1.getVolunteerHoursTrends);
/**
 * GET /api/analytics/trends/event-attendance
 * Get event attendance trends over time (monthly)
 */
router.get('/trends/event-attendance', [(0, express_validator_1.query)('months').optional().isInt({ min: 1, max: 24 })], validation_1.handleValidationErrors, analyticsAuth_1.requireOrgAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_event_trends'), analyticsController_1.getEventAttendanceTrends);
/**
 * GET /api/analytics/comparative
 * Get comparative analytics (YoY, MoM, QoQ)
 */
router.get('/comparative', [(0, express_validator_1.query)('period').optional().isIn(['month', 'quarter', 'year'])], validation_1.handleValidationErrors, analyticsAuth_1.requireOrgAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_comparative_analytics'), analyticsController_1.getComparativeAnalytics);
/**
 * GET /api/analytics/trends/:metricType
 * Get trend analysis with moving averages
 * Supported metric types: donations, volunteer_hours, event_attendance
 */
router.get('/trends/:metricType', [
    (0, express_validator_1.param)('metricType').isIn(['donations', 'volunteer_hours', 'event_attendance']),
    (0, express_validator_1.query)('months').optional().isInt({ min: 1, max: 36 }),
], validation_1.handleValidationErrors, analyticsAuth_1.requireOrgAnalytics, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_trend_analysis'), analyticsController_1.getTrendAnalysis);
/**
 * GET /api/analytics/anomalies/:metricType
 * Detect anomalies using statistical analysis
 * Supported metric types: donations, volunteer_hours, event_attendance
 */
router.get('/anomalies/:metricType', [
    (0, express_validator_1.param)('metricType').isIn(['donations', 'volunteer_hours', 'event_attendance']),
    (0, express_validator_1.query)('months').optional().isInt({ min: 3, max: 36 }),
    (0, express_validator_1.query)('sensitivity').optional().isFloat({ min: 1.0, max: 4.0 }),
], validation_1.handleValidationErrors, analyticsAuth_1.requireAnomalyAccess, (0, analyticsAuth_1.auditAnalyticsMiddleware)('view_anomaly_detection'), analyticsController_1.detectAnomalies);
exports.default = router;
//# sourceMappingURL=analytics.js.map