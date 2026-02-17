"use strict";
/**
 * Dashboard Routes
 * API routes for dashboard configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const dashboardController_1 = require("../controllers/dashboardController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * GET /api/dashboard/configs
 * Get all dashboard configurations for current user
 */
router.get('/configs', dashboardController_1.getDashboards);
/**
 * GET /api/dashboard/configs/default
 * Get user's default dashboard (or create if doesn't exist)
 */
router.get('/configs/default', dashboardController_1.getDefaultDashboard);
/**
 * GET /api/dashboard/configs/:id
 * Get a specific dashboard configuration
 */
router.get('/configs/:id', [(0, express_validator_1.param)('id').isUUID()], dashboardController_1.getDashboard);
/**
 * POST /api/dashboard/configs
 * Create a new dashboard configuration
 */
router.post('/configs', [
    (0, express_validator_1.body)('name').isString().trim().notEmpty().withMessage('Dashboard name is required'),
    (0, express_validator_1.body)('is_default').isBoolean().optional(),
    (0, express_validator_1.body)('widgets').isArray().withMessage('Widgets must be an array'),
    (0, express_validator_1.body)('layout').isArray().withMessage('Layout must be an array'),
    (0, express_validator_1.body)('breakpoints').optional().isObject(),
    (0, express_validator_1.body)('cols').optional().isObject(),
], dashboardController_1.createDashboard);
/**
 * PUT /api/dashboard/configs/:id
 * Update dashboard configuration
 */
router.put('/configs/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('name').optional().isString().trim().notEmpty(),
    (0, express_validator_1.body)('is_default').optional().isBoolean(),
    (0, express_validator_1.body)('widgets').optional().isArray(),
    (0, express_validator_1.body)('layout').optional().isArray(),
    (0, express_validator_1.body)('breakpoints').optional().isObject(),
    (0, express_validator_1.body)('cols').optional().isObject(),
], dashboardController_1.updateDashboard);
/**
 * PUT /api/dashboard/configs/:id/layout
 * Update only the layout of a dashboard (quick save)
 */
router.put('/configs/:id/layout', [(0, express_validator_1.param)('id').isUUID(), (0, express_validator_1.body)('layout').isArray().withMessage('Layout must be an array')], dashboardController_1.updateDashboardLayout);
/**
 * DELETE /api/dashboard/configs/:id
 * Delete dashboard configuration
 */
router.delete('/configs/:id', [(0, express_validator_1.param)('id').isUUID()], dashboardController_1.deleteDashboard);
exports.default = router;
//# sourceMappingURL=dashboard.js.map