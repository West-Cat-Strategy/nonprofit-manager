"use strict";
/**
 * Report Routes
 * API routes for custom report generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const reportController_1 = require("../controllers/reportController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * POST /api/reports/generate
 * Generate a custom report
 */
router.post('/generate', [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Report name is required'),
    (0, express_validator_1.body)('entity')
        .isIn(['accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks'])
        .withMessage('Invalid entity type'),
    (0, express_validator_1.body)('fields').isArray({ min: 1 }).withMessage('At least one field must be selected'),
    (0, express_validator_1.body)('filters').optional().isArray(),
    (0, express_validator_1.body)('sort').optional().isArray(),
    (0, express_validator_1.body)('limit').optional().isInt({ min: 1, max: 10000 }),
], reportController_1.generateReport);
/**
 * GET /api/reports/fields/:entity
 * Get available fields for an entity type
 */
router.get('/fields/:entity', [
    (0, express_validator_1.param)('entity')
        .isIn(['accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks'])
        .withMessage('Invalid entity type'),
], reportController_1.getAvailableFields);
exports.default = router;
//# sourceMappingURL=reports.js.map