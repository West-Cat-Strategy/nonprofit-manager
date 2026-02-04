"use strict";
/**
 * Alert Routes
 * API routes for alert configuration and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const alertController_1 = require("../controllers/alertController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * GET /api/alerts/configs
 * Get all alert configurations for current user
 */
router.get('/configs', alertController_1.getAlertConfigs);
/**
 * GET /api/alerts/configs/:id
 * Get a specific alert configuration
 */
router.get('/configs/:id', [(0, express_validator_1.param)('id').isUUID()], alertController_1.getAlertConfig);
/**
 * POST /api/alerts/configs
 * Create a new alert configuration
 */
router.post('/configs', [
    (0, express_validator_1.body)('name').isString().trim().notEmpty().withMessage('Alert name is required'),
    (0, express_validator_1.body)('metric_type')
        .isString()
        .isIn(['donations', 'donation_amount', 'volunteer_hours', 'event_attendance', 'case_volume', 'engagement_score'])
        .withMessage('Invalid metric type'),
    (0, express_validator_1.body)('condition')
        .isString()
        .isIn(['exceeds', 'drops_below', 'changes_by', 'anomaly_detected', 'trend_reversal'])
        .withMessage('Invalid condition'),
    (0, express_validator_1.body)('threshold').optional().isNumeric(),
    (0, express_validator_1.body)('percentage_change').optional().isNumeric(),
    (0, express_validator_1.body)('sensitivity').optional().isFloat({ min: 1.0, max: 4.0 }),
    (0, express_validator_1.body)('frequency')
        .isString()
        .isIn(['real_time', 'daily', 'weekly', 'monthly'])
        .withMessage('Invalid frequency'),
    (0, express_validator_1.body)('channels').isArray().withMessage('Channels must be an array'),
    (0, express_validator_1.body)('severity')
        .isString()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid severity'),
    (0, express_validator_1.body)('enabled').isBoolean().optional(),
    (0, express_validator_1.body)('recipients').optional().isArray(),
    (0, express_validator_1.body)('filters').optional().isObject(),
], alertController_1.createAlertConfig);
/**
 * PUT /api/alerts/configs/:id
 * Update alert configuration
 */
router.put('/configs/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('name').optional().isString().trim().notEmpty(),
    (0, express_validator_1.body)('metric_type').optional().isString(),
    (0, express_validator_1.body)('condition').optional().isString(),
    (0, express_validator_1.body)('threshold').optional().isNumeric(),
    (0, express_validator_1.body)('percentage_change').optional().isNumeric(),
    (0, express_validator_1.body)('sensitivity').optional().isFloat({ min: 1.0, max: 4.0 }),
    (0, express_validator_1.body)('frequency').optional().isString(),
    (0, express_validator_1.body)('channels').optional().isArray(),
    (0, express_validator_1.body)('severity').optional().isString(),
    (0, express_validator_1.body)('enabled').optional().isBoolean(),
    (0, express_validator_1.body)('recipients').optional().isArray(),
    (0, express_validator_1.body)('filters').optional().isObject(),
], alertController_1.updateAlertConfig);
/**
 * DELETE /api/alerts/configs/:id
 * Delete alert configuration
 */
router.delete('/configs/:id', [(0, express_validator_1.param)('id').isUUID()], alertController_1.deleteAlertConfig);
/**
 * PATCH /api/alerts/configs/:id/toggle
 * Toggle alert enabled status
 */
router.patch('/configs/:id/toggle', [(0, express_validator_1.param)('id').isUUID()], alertController_1.toggleAlertConfig);
/**
 * POST /api/alerts/test
 * Test alert configuration without saving
 */
router.post('/test', [
    (0, express_validator_1.body)('metric_type').isString().notEmpty(),
    (0, express_validator_1.body)('condition').isString().notEmpty(),
    (0, express_validator_1.body)('threshold').optional().isNumeric(),
    (0, express_validator_1.body)('percentage_change').optional().isNumeric(),
    (0, express_validator_1.body)('sensitivity').optional().isFloat({ min: 1.0, max: 4.0 }),
], alertController_1.testAlertConfig);
/**
 * GET /api/alerts/instances
 * Get alert instances (triggered alerts)
 */
router.get('/instances', [
    (0, express_validator_1.query)('status').optional().isString(),
    (0, express_validator_1.query)('severity').optional().isString(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
], alertController_1.getAlertInstances);
/**
 * PATCH /api/alerts/instances/:id/acknowledge
 * Acknowledge an alert instance
 */
router.patch('/instances/:id/acknowledge', [(0, express_validator_1.param)('id').isUUID()], alertController_1.acknowledgeAlert);
/**
 * PATCH /api/alerts/instances/:id/resolve
 * Resolve an alert instance
 */
router.patch('/instances/:id/resolve', [(0, express_validator_1.param)('id').isUUID()], alertController_1.resolveAlert);
/**
 * GET /api/alerts/stats
 * Get alert statistics for current user
 */
router.get('/stats', alertController_1.getAlertStats);
exports.default = router;
//# sourceMappingURL=alerts.js.map