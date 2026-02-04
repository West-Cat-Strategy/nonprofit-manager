"use strict";
/**
 * Saved Report Routes
 * API routes for saved report management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const savedReportController_1 = require("../controllers/savedReportController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * GET /api/saved-reports
 * Get all saved reports for current user
 */
router.get('/', savedReportController_1.getSavedReports);
/**
 * GET /api/saved-reports/:id
 * Get a specific saved report by ID
 */
router.get('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid report ID'),
], savedReportController_1.getSavedReportById);
/**
 * POST /api/saved-reports
 * Create a new saved report
 */
router.post('/', [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required').trim(),
    (0, express_validator_1.body)('description').optional().trim(),
    (0, express_validator_1.body)('entity')
        .isIn(['accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks'])
        .withMessage('Invalid entity type'),
    (0, express_validator_1.body)('report_definition').isObject().withMessage('Report definition must be an object'),
    (0, express_validator_1.body)('is_public').optional().isBoolean().withMessage('is_public must be a boolean'),
], savedReportController_1.createSavedReport);
/**
 * PUT /api/saved-reports/:id
 * Update an existing saved report
 */
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid report ID'),
    (0, express_validator_1.body)('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
    (0, express_validator_1.body)('description').optional().trim(),
    (0, express_validator_1.body)('report_definition').optional().isObject().withMessage('Report definition must be an object'),
    (0, express_validator_1.body)('is_public').optional().isBoolean().withMessage('is_public must be a boolean'),
], savedReportController_1.updateSavedReport);
/**
 * DELETE /api/saved-reports/:id
 * Delete a saved report
 */
router.delete('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid report ID'),
], savedReportController_1.deleteSavedReport);
exports.default = router;
//# sourceMappingURL=savedReports.js.map