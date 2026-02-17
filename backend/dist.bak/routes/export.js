"use strict";
/**
 * Export Routes
 * API routes for exporting analytics data
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const exportController_1 = require("../controllers/exportController");
const auth_1 = require("../middleware/auth");
const analyticsAuth_1 = require("../middleware/analyticsAuth");
const dataScope_1 = require("../middleware/dataScope");
const router = (0, express_1.Router)();
// All routes require authentication and export permissions
router.use(auth_1.authenticate);
router.use(analyticsAuth_1.requireExportPermission);
router.use((0, dataScope_1.loadDataScope)('exports'));
/**
 * POST /api/export/analytics-summary
 * Export analytics summary
 */
router.post('/analytics-summary', [
    (0, express_validator_1.body)('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format'),
    (0, express_validator_1.body)('filename').optional().isString(),
    (0, express_validator_1.body)('start_date').optional().isISO8601(),
    (0, express_validator_1.body)('end_date').optional().isISO8601(),
    (0, express_validator_1.body)('donor_type').optional().isString(),
    (0, express_validator_1.body)('payment_method').optional().isString(),
], exportController_1.exportAnalyticsSummary);
/**
 * POST /api/export/donations
 * Export donation data
 */
router.post('/donations', [
    (0, express_validator_1.body)('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format'),
    (0, express_validator_1.body)('filename').optional().isString(),
    (0, express_validator_1.body)('start_date').optional().isISO8601(),
    (0, express_validator_1.body)('end_date').optional().isISO8601(),
    (0, express_validator_1.body)('donor_id').optional().isUUID(),
    (0, express_validator_1.body)('payment_method').optional().isString(),
    (0, express_validator_1.body)('min_amount').optional().isNumeric(),
    (0, express_validator_1.body)('max_amount').optional().isNumeric(),
], exportController_1.exportDonations);
/**
 * POST /api/export/volunteer-hours
 * Export volunteer hours data
 */
router.post('/volunteer-hours', [
    (0, express_validator_1.body)('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format'),
    (0, express_validator_1.body)('filename').optional().isString(),
    (0, express_validator_1.body)('start_date').optional().isISO8601(),
    (0, express_validator_1.body)('end_date').optional().isISO8601(),
    (0, express_validator_1.body)('volunteer_id').optional().isUUID(),
    (0, express_validator_1.body)('activity_type').optional().isString(),
], exportController_1.exportVolunteerHours);
/**
 * POST /api/export/events
 * Export event attendance data
 */
router.post('/events', [
    (0, express_validator_1.body)('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format'),
    (0, express_validator_1.body)('filename').optional().isString(),
    (0, express_validator_1.body)('start_date').optional().isISO8601(),
    (0, express_validator_1.body)('end_date').optional().isISO8601(),
    (0, express_validator_1.body)('event_type').optional().isString(),
    (0, express_validator_1.body)('status').optional().isString(),
], exportController_1.exportEvents);
/**
 * POST /api/export/comprehensive
 * Export comprehensive report with multiple sheets
 */
router.post('/comprehensive', [
    (0, express_validator_1.body)('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format (Excel recommended)'),
    (0, express_validator_1.body)('filename').optional().isString(),
    (0, express_validator_1.body)('start_date').isISO8601().withMessage('Start date is required'),
    (0, express_validator_1.body)('end_date').isISO8601().withMessage('End date is required'),
], exportController_1.exportComprehensive);
exports.default = router;
//# sourceMappingURL=export.js.map