"use strict";
/**
 * Template Routes
 * Express routes for website builder templates and pages
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const templateController = __importStar(require("../controllers/templateController"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Valid template categories
const validCategories = ['landing-page', 'event', 'donation', 'blog', 'multi-page', 'portfolio', 'contact'];
const validStatuses = ['draft', 'published', 'archived'];
// ==================== System Templates ====================
/**
 * GET /api/templates/system
 * Get all system templates
 */
router.get('/system', templateController.getSystemTemplates);
/**
 * GET /api/templates/palettes
 * Get available color palettes
 */
router.get('/palettes', templateController.listColorPalettes);
/**
 * GET /api/templates/fonts
 * Get available font pairings
 */
router.get('/fonts', templateController.listFontPairings);
// ==================== Template CRUD ====================
/**
 * GET /api/templates
 * Search and list templates
 */
router.get('/', [
    (0, express_validator_1.query)('search')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('Search term must be less than 100 characters'),
    (0, express_validator_1.query)('category')
        .optional()
        .isIn(validCategories)
        .withMessage('Invalid category'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(validStatuses)
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['name', 'createdAt', 'updatedAt'])
        .withMessage('Invalid sort field'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
], validation_1.handleValidationErrors, templateController.searchTemplates);
/**
 * GET /api/templates/:templateId/css
 * Get CSS variables for a template theme
 */
router.get('/:templateId/css', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
], validation_1.handleValidationErrors, templateController.getTemplateCss);
/**
 * GET /api/templates/:templateId
 * Get a specific template
 */
router.get('/:templateId', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
], validation_1.handleValidationErrors, templateController.getTemplate);
/**
 * GET /api/templates/:templateId/preview
 * Generate preview for a template
 */
router.get('/:templateId/preview', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.query)('page')
        .optional()
        .isString()
        .withMessage('Page slug must be a string'),
], validation_1.handleValidationErrors, templateController.previewTemplate);
/**
 * POST /api/templates/:templateId/apply-palette
 * Apply a color palette to a template
 */
router.post('/:templateId/apply-palette', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.body)('paletteId')
        .isUUID()
        .withMessage('paletteId must be a valid UUID'),
], validation_1.handleValidationErrors, templateController.applyTemplatePalette);
/**
 * POST /api/templates/:templateId/apply-font
 * Apply a font pairing to a template
 */
router.post('/:templateId/apply-font', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.body)('fontPairingId')
        .isUUID()
        .withMessage('fontPairingId must be a valid UUID'),
], validation_1.handleValidationErrors, templateController.applyTemplateFontPairing);
/**
 * POST /api/templates
 * Create a new template
 */
router.post('/', [
    (0, express_validator_1.body)('name')
        .notEmpty()
        .withMessage('Template name is required')
        .isString()
        .isLength({ min: 1, max: 255 })
        .withMessage('Template name must be 1-255 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    (0, express_validator_1.body)('category')
        .notEmpty()
        .withMessage('Category is required')
        .isIn(validCategories)
        .withMessage('Invalid category'),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    (0, express_validator_1.body)('tags.*')
        .optional()
        .isString()
        .isLength({ max: 50 })
        .withMessage('Each tag must be a string of max 50 characters'),
    (0, express_validator_1.body)('cloneFromId')
        .optional()
        .isUUID()
        .withMessage('Clone from ID must be a valid UUID'),
], validation_1.handleValidationErrors, templateController.createTemplate);
/**
 * PUT /api/templates/:templateId
 * Update a template
 */
router.put('/:templateId', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.body)('name')
        .optional()
        .isString()
        .isLength({ min: 1, max: 255 })
        .withMessage('Template name must be 1-255 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    (0, express_validator_1.body)('category')
        .optional()
        .isIn(validCategories)
        .withMessage('Invalid category'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(validStatuses)
        .withMessage('Invalid status'),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
], validation_1.handleValidationErrors, templateController.updateTemplate);
/**
 * DELETE /api/templates/:templateId
 * Delete a template
 */
router.delete('/:templateId', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
], validation_1.handleValidationErrors, templateController.deleteTemplate);
/**
 * POST /api/templates/:templateId/duplicate
 * Duplicate a template
 */
router.post('/:templateId/duplicate', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.body)('name')
        .optional()
        .isString()
        .isLength({ min: 1, max: 255 })
        .withMessage('Template name must be 1-255 characters'),
], validation_1.handleValidationErrors, templateController.duplicateTemplate);
// ==================== Template Pages ====================
/**
 * GET /api/templates/:templateId/pages
 * Get all pages for a template
 */
router.get('/:templateId/pages', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
], validation_1.handleValidationErrors, templateController.getTemplatePages);
/**
 * GET /api/templates/:templateId/pages/:pageId
 * Get a specific page
 */
router.get('/:templateId/pages/:pageId', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.param)('pageId')
        .isUUID()
        .withMessage('Invalid page ID'),
], validation_1.handleValidationErrors, templateController.getTemplatePage);
/**
 * POST /api/templates/:templateId/pages
 * Create a new page
 */
router.post('/:templateId/pages', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.body)('name')
        .notEmpty()
        .withMessage('Page name is required')
        .isString()
        .isLength({ min: 1, max: 255 })
        .withMessage('Page name must be 1-255 characters'),
    (0, express_validator_1.body)('slug')
        .notEmpty()
        .withMessage('Page slug is required')
        .isString()
        .isLength({ min: 1, max: 255 })
        .withMessage('Page slug must be 1-255 characters')
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    (0, express_validator_1.body)('isHomepage')
        .optional()
        .isBoolean()
        .withMessage('isHomepage must be a boolean'),
    (0, express_validator_1.body)('cloneFromId')
        .optional()
        .isUUID()
        .withMessage('Clone from ID must be a valid UUID'),
], validation_1.handleValidationErrors, templateController.createTemplatePage);
/**
 * PUT /api/templates/:templateId/pages/:pageId
 * Update a page
 */
router.put('/:templateId/pages/:pageId', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.param)('pageId')
        .isUUID()
        .withMessage('Invalid page ID'),
    (0, express_validator_1.body)('name')
        .optional()
        .isString()
        .isLength({ min: 1, max: 255 })
        .withMessage('Page name must be 1-255 characters'),
    (0, express_validator_1.body)('slug')
        .optional()
        .isString()
        .isLength({ min: 1, max: 255 })
        .withMessage('Page slug must be 1-255 characters')
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    (0, express_validator_1.body)('isHomepage')
        .optional()
        .isBoolean()
        .withMessage('isHomepage must be a boolean'),
], validation_1.handleValidationErrors, templateController.updateTemplatePage);
/**
 * DELETE /api/templates/:templateId/pages/:pageId
 * Delete a page
 */
router.delete('/:templateId/pages/:pageId', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.param)('pageId')
        .isUUID()
        .withMessage('Invalid page ID'),
], validation_1.handleValidationErrors, templateController.deleteTemplatePage);
/**
 * PUT /api/templates/:templateId/pages/reorder
 * Reorder pages
 */
router.put('/:templateId/pages/reorder', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.body)('pageIds')
        .isArray({ min: 1 })
        .withMessage('Page IDs array is required'),
    (0, express_validator_1.body)('pageIds.*')
        .isUUID()
        .withMessage('Each page ID must be a valid UUID'),
], validation_1.handleValidationErrors, templateController.reorderTemplatePages);
// ==================== Version Management ====================
/**
 * GET /api/templates/:templateId/versions
 * Get version history
 */
router.get('/:templateId/versions', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
], validation_1.handleValidationErrors, templateController.getTemplateVersions);
/**
 * POST /api/templates/:templateId/versions
 * Create a new version snapshot
 */
router.post('/:templateId/versions', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.body)('changes')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Changes description must be less than 500 characters'),
], validation_1.handleValidationErrors, templateController.createTemplateVersion);
/**
 * POST /api/templates/:templateId/versions/:versionId/restore
 * Restore a version
 */
router.post('/:templateId/versions/:versionId/restore', [
    (0, express_validator_1.param)('templateId')
        .isUUID()
        .withMessage('Invalid template ID'),
    (0, express_validator_1.param)('versionId')
        .isUUID()
        .withMessage('Invalid version ID'),
], validation_1.handleValidationErrors, templateController.restoreTemplateVersion);
exports.default = router;
//# sourceMappingURL=templates.js.map