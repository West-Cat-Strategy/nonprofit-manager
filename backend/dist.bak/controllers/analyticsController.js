"use strict";
/**
 * Analytics Controller
 * Handles HTTP requests for constituent analytics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAnomalies = exports.getTrendAnalysis = exports.getComparativeAnalytics = exports.getEventAttendanceTrends = exports.getVolunteerHoursTrends = exports.getDonationTrends = exports.getContactVolunteerMetrics = exports.getContactEventMetrics = exports.getAccountEventMetrics = exports.getContactDonationMetrics = exports.getAccountDonationMetrics = exports.getAnalyticsSummary = exports.getContactAnalytics = exports.getAccountAnalytics = void 0;
const analyticsService_1 = require("../services/analyticsService");
const database_1 = __importDefault(require("../config/database"));
const analyticsAuth_1 = require("../middleware/analyticsAuth");
const analyticsService = new analyticsService_1.AnalyticsService(database_1.default);
const denyIfScopedForOrgWide = (scope, res) => {
    if (!scope)
        return false;
    const hasScope = (scope.accountIds && scope.accountIds.length > 0) ||
        (scope.contactIds && scope.contactIds.length > 0) ||
        (scope.createdByUserIds && scope.createdByUserIds.length > 0);
    if (hasScope) {
        res.status(403).json({ error: 'Scoped access does not allow organization-wide analytics' });
        return true;
    }
    return false;
};
const denyIfAccountOutOfScope = (scope, accountId, res) => {
    if (scope?.accountIds && scope.accountIds.length > 0 && !scope.accountIds.includes(accountId)) {
        res.status(404).json({ error: 'Account not found' });
        return true;
    }
    return false;
};
const denyIfContactOutOfScope = (scope, contactId, res) => {
    if (scope?.contactIds && scope.contactIds.length > 0 && !scope.contactIds.includes(contactId)) {
        res.status(404).json({ error: 'Contact not found' });
        return true;
    }
    return false;
};
/**
 * GET /api/analytics/accounts/:id
 * Get analytics for a specific account
 */
const getAccountAnalytics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scope = req.dataScope?.filter;
        if (denyIfAccountOutOfScope(scope, id, res)) {
            return;
        }
        const analytics = await analyticsService.getAccountAnalytics(id);
        const maskedAnalytics = (0, analyticsAuth_1.maskFinancialData)(analytics, req.user.role);
        res.json(maskedAnalytics);
    }
    catch (error) {
        if (error.message === 'Account not found') {
            res.status(404).json({ error: 'Account not found' });
            return;
        }
        next(error);
    }
};
exports.getAccountAnalytics = getAccountAnalytics;
/**
 * GET /api/analytics/contacts/:id
 * Get analytics for a specific contact
 */
const getContactAnalytics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scope = req.dataScope?.filter;
        if (denyIfContactOutOfScope(scope, id, res)) {
            return;
        }
        const analytics = await analyticsService.getContactAnalytics(id);
        const maskedAnalytics = (0, analyticsAuth_1.maskFinancialData)(analytics, req.user.role);
        res.json(maskedAnalytics);
    }
    catch (error) {
        if (error.message === 'Contact not found') {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }
        next(error);
    }
};
exports.getContactAnalytics = getContactAnalytics;
/**
 * GET /api/analytics/summary
 * Get organization-wide analytics summary
 */
const getAnalyticsSummary = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (denyIfScopedForOrgWide(scope, res)) {
            return;
        }
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            account_type: req.query.account_type,
            category: req.query.category,
        };
        const summary = await analyticsService.getAnalyticsSummary(filters);
        const maskedSummary = (0, analyticsAuth_1.maskFinancialData)(summary, req.user.role);
        res.json(maskedSummary);
    }
    catch (error) {
        next(error);
    }
};
exports.getAnalyticsSummary = getAnalyticsSummary;
/**
 * GET /api/analytics/accounts/:id/donations
 * Get donation metrics for a specific account
 */
const getAccountDonationMetrics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scope = req.dataScope?.filter;
        if (denyIfAccountOutOfScope(scope, id, res)) {
            return;
        }
        const metrics = await analyticsService.getDonationMetrics('account', id);
        const maskedMetrics = (0, analyticsAuth_1.maskFinancialData)(metrics, req.user.role);
        res.json(maskedMetrics);
    }
    catch (error) {
        next(error);
    }
};
exports.getAccountDonationMetrics = getAccountDonationMetrics;
/**
 * GET /api/analytics/contacts/:id/donations
 * Get donation metrics for a specific contact
 */
const getContactDonationMetrics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scope = req.dataScope?.filter;
        if (denyIfContactOutOfScope(scope, id, res)) {
            return;
        }
        const metrics = await analyticsService.getDonationMetrics('contact', id);
        const maskedMetrics = (0, analyticsAuth_1.maskFinancialData)(metrics, req.user.role);
        res.json(maskedMetrics);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactDonationMetrics = getContactDonationMetrics;
/**
 * GET /api/analytics/accounts/:id/events
 * Get event metrics for a specific account
 */
const getAccountEventMetrics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scope = req.dataScope?.filter;
        if (denyIfAccountOutOfScope(scope, id, res)) {
            return;
        }
        const metrics = await analyticsService.getEventMetrics('account', id);
        res.json(metrics);
    }
    catch (error) {
        next(error);
    }
};
exports.getAccountEventMetrics = getAccountEventMetrics;
/**
 * GET /api/analytics/contacts/:id/events
 * Get event metrics for a specific contact
 */
const getContactEventMetrics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scope = req.dataScope?.filter;
        if (denyIfContactOutOfScope(scope, id, res)) {
            return;
        }
        const metrics = await analyticsService.getEventMetrics('contact', id);
        res.json(metrics);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactEventMetrics = getContactEventMetrics;
/**
 * GET /api/analytics/contacts/:id/volunteer
 * Get volunteer metrics for a specific contact
 */
const getContactVolunteerMetrics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scope = req.dataScope?.filter;
        if (denyIfContactOutOfScope(scope, id, res)) {
            return;
        }
        const metrics = await analyticsService.getVolunteerMetrics(id);
        if (!metrics) {
            res.status(404).json({ error: 'Contact is not a volunteer' });
            return;
        }
        res.json(metrics);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactVolunteerMetrics = getContactVolunteerMetrics;
/**
 * GET /api/analytics/trends/donations
 * Get donation trends by month
 */
const getDonationTrends = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (denyIfScopedForOrgWide(scope, res)) {
            return;
        }
        const months = parseInt(req.query.months) || 12;
        const trends = await analyticsService.getDonationTrends(Math.min(months, 24));
        const maskedTrends = (0, analyticsAuth_1.maskFinancialData)(trends, req.user.role);
        res.json(maskedTrends);
    }
    catch (error) {
        next(error);
    }
};
exports.getDonationTrends = getDonationTrends;
/**
 * GET /api/analytics/trends/volunteer-hours
 * Get volunteer hours trends by month
 */
const getVolunteerHoursTrends = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (denyIfScopedForOrgWide(scope, res)) {
            return;
        }
        const months = parseInt(req.query.months) || 12;
        const trends = await analyticsService.getVolunteerHoursTrends(Math.min(months, 24));
        res.json(trends);
    }
    catch (error) {
        next(error);
    }
};
exports.getVolunteerHoursTrends = getVolunteerHoursTrends;
/**
 * GET /api/analytics/trends/event-attendance
 * Get event attendance trends by month
 */
const getEventAttendanceTrends = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (denyIfScopedForOrgWide(scope, res)) {
            return;
        }
        const months = parseInt(req.query.months) || 12;
        const trends = await analyticsService.getEventAttendanceTrends(Math.min(months, 24));
        res.json(trends);
    }
    catch (error) {
        next(error);
    }
};
exports.getEventAttendanceTrends = getEventAttendanceTrends;
/**
 * GET /api/analytics/comparative
 * Get comparative analytics (YoY, MoM, QoQ)
 */
const getComparativeAnalytics = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (denyIfScopedForOrgWide(scope, res)) {
            return;
        }
        const periodType = req.query.period || 'month';
        // Validate period type
        if (!['month', 'quarter', 'year'].includes(periodType)) {
            res.status(400).json({ error: 'Invalid period type. Must be month, quarter, or year' });
            return;
        }
        const analytics = await analyticsService.getComparativeAnalytics(periodType);
        const maskedAnalytics = (0, analyticsAuth_1.maskFinancialData)(analytics, req.user.role);
        res.json(maskedAnalytics);
    }
    catch (error) {
        next(error);
    }
};
exports.getComparativeAnalytics = getComparativeAnalytics;
/**
 * GET /api/analytics/trends/:metricType
 * Get trend analysis with moving averages for a metric
 */
const getTrendAnalysis = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (denyIfScopedForOrgWide(scope, res)) {
            return;
        }
        const { metricType } = req.params;
        const months = parseInt(req.query.months) || 12;
        if (!['donations', 'volunteer_hours', 'event_attendance'].includes(metricType)) {
            res.status(400).json({ error: 'Invalid metric type. Must be donations, volunteer_hours, or event_attendance' });
            return;
        }
        if (months < 1 || months > 36) {
            res.status(400).json({ error: 'Months must be between 1 and 36' });
            return;
        }
        const analysis = await analyticsService.getTrendAnalysis(metricType, months);
        res.json(analysis);
    }
    catch (error) {
        next(error);
    }
};
exports.getTrendAnalysis = getTrendAnalysis;
/**
 * GET /api/analytics/anomalies/:metricType
 * Detect anomalies in metric data using statistical methods
 */
const detectAnomalies = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (denyIfScopedForOrgWide(scope, res)) {
            return;
        }
        const { metricType } = req.params;
        const months = parseInt(req.query.months) || 12;
        const sensitivity = parseFloat(req.query.sensitivity) || 2.0;
        if (!['donations', 'volunteer_hours', 'event_attendance'].includes(metricType)) {
            res.status(400).json({ error: 'Invalid metric type. Must be donations, volunteer_hours, or event_attendance' });
            return;
        }
        if (months < 3 || months > 36) {
            res.status(400).json({ error: 'Months must be between 3 and 36 for anomaly detection' });
            return;
        }
        if (sensitivity < 1.0 || sensitivity > 4.0) {
            res.status(400).json({ error: 'Sensitivity must be between 1.0 (very sensitive) and 4.0 (less sensitive)' });
            return;
        }
        const result = await analyticsService.detectAnomalies(metricType, months, sensitivity);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.detectAnomalies = detectAnomalies;
exports.default = {
    getAccountAnalytics: exports.getAccountAnalytics,
    getContactAnalytics: exports.getContactAnalytics,
    getAnalyticsSummary: exports.getAnalyticsSummary,
    getAccountDonationMetrics: exports.getAccountDonationMetrics,
    getContactDonationMetrics: exports.getContactDonationMetrics,
    getAccountEventMetrics: exports.getAccountEventMetrics,
    getContactEventMetrics: exports.getContactEventMetrics,
    getContactVolunteerMetrics: exports.getContactVolunteerMetrics,
    getDonationTrends: exports.getDonationTrends,
    getVolunteerHoursTrends: exports.getVolunteerHoursTrends,
    getEventAttendanceTrends: exports.getEventAttendanceTrends,
    getComparativeAnalytics: exports.getComparativeAnalytics,
    getTrendAnalysis: exports.getTrendAnalysis,
    detectAnomalies: exports.detectAnomalies,
};
//# sourceMappingURL=analyticsController.js.map