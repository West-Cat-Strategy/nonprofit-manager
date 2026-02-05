/**
 * Template Routes
 * Express routes for website builder templates and pages
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import * as templateController from '../controllers/templateController';

const router = Router();

// All routes require authentication
router.use(authenticate);

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
router.get(
  '/',
  [
    query('search')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters'),
    query('category')
      .optional()
      .isIn(validCategories)
      .withMessage('Invalid category'),
    query('status')
      .optional()
      .isIn(validStatuses)
      .withMessage('Invalid status'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .isIn(['name', 'createdAt', 'updatedAt'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],
  validateRequest,
  templateController.searchTemplates
);

/**
 * GET /api/templates/:templateId/css
 * Get CSS variables for a template theme
 */
router.get(
  '/:templateId/css',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
  ],
  validateRequest,
  templateController.getTemplateCss
);

/**
 * GET /api/templates/:templateId
 * Get a specific template
 */
router.get(
  '/:templateId',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
  ],
  validateRequest,
  templateController.getTemplate
);

/**
 * GET /api/templates/:templateId/preview
 * Generate preview for a template
 */
router.get(
  '/:templateId/preview',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    query('page')
      .optional()
      .isString()
      .withMessage('Page slug must be a string'),
  ],
  validateRequest,
  templateController.previewTemplate
);

/**
 * POST /api/templates/:templateId/apply-palette
 * Apply a color palette to a template
 */
router.post(
  '/:templateId/apply-palette',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('paletteId')
      .isUUID()
      .withMessage('paletteId must be a valid UUID'),
  ],
  validateRequest,
  templateController.applyTemplatePalette
);

/**
 * POST /api/templates/:templateId/apply-font
 * Apply a font pairing to a template
 */
router.post(
  '/:templateId/apply-font',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('fontPairingId')
      .isUUID()
      .withMessage('fontPairingId must be a valid UUID'),
  ],
  validateRequest,
  templateController.applyTemplateFontPairing
);

/**
 * POST /api/templates
 * Create a new template
 */
router.post(
  '/',
  [
    body('name')
      .notEmpty()
      .withMessage('Template name is required')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Template name must be 1-255 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isIn(validCategories)
      .withMessage('Invalid category'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Each tag must be a string of max 50 characters'),
    body('cloneFromId')
      .optional()
      .isUUID()
      .withMessage('Clone from ID must be a valid UUID'),
  ],
  validateRequest,
  templateController.createTemplate
);

/**
 * PUT /api/templates/:templateId
 * Update a template
 */
router.put(
  '/:templateId',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Template name must be 1-255 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('category')
      .optional()
      .isIn(validCategories)
      .withMessage('Invalid category'),
    body('status')
      .optional()
      .isIn(validStatuses)
      .withMessage('Invalid status'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
  ],
  validateRequest,
  templateController.updateTemplate
);

/**
 * DELETE /api/templates/:templateId
 * Delete a template
 */
router.delete(
  '/:templateId',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
  ],
  validateRequest,
  templateController.deleteTemplate
);

/**
 * POST /api/templates/:templateId/duplicate
 * Duplicate a template
 */
router.post(
  '/:templateId/duplicate',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Template name must be 1-255 characters'),
  ],
  validateRequest,
  templateController.duplicateTemplate
);

// ==================== Template Pages ====================

/**
 * GET /api/templates/:templateId/pages
 * Get all pages for a template
 */
router.get(
  '/:templateId/pages',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
  ],
  validateRequest,
  templateController.getTemplatePages
);

/**
 * GET /api/templates/:templateId/pages/:pageId
 * Get a specific page
 */
router.get(
  '/:templateId/pages/:pageId',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    param('pageId')
      .isUUID()
      .withMessage('Invalid page ID'),
  ],
  validateRequest,
  templateController.getTemplatePage
);

/**
 * POST /api/templates/:templateId/pages
 * Create a new page
 */
router.post(
  '/:templateId/pages',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('name')
      .notEmpty()
      .withMessage('Page name is required')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Page name must be 1-255 characters'),
    body('slug')
      .notEmpty()
      .withMessage('Page slug is required')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Page slug must be 1-255 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('isHomepage')
      .optional()
      .isBoolean()
      .withMessage('isHomepage must be a boolean'),
    body('cloneFromId')
      .optional()
      .isUUID()
      .withMessage('Clone from ID must be a valid UUID'),
  ],
  validateRequest,
  templateController.createTemplatePage
);

/**
 * PUT /api/templates/:templateId/pages/:pageId
 * Update a page
 */
router.put(
  '/:templateId/pages/:pageId',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    param('pageId')
      .isUUID()
      .withMessage('Invalid page ID'),
    body('name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Page name must be 1-255 characters'),
    body('slug')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Page slug must be 1-255 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('isHomepage')
      .optional()
      .isBoolean()
      .withMessage('isHomepage must be a boolean'),
  ],
  validateRequest,
  templateController.updateTemplatePage
);

/**
 * DELETE /api/templates/:templateId/pages/:pageId
 * Delete a page
 */
router.delete(
  '/:templateId/pages/:pageId',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    param('pageId')
      .isUUID()
      .withMessage('Invalid page ID'),
  ],
  validateRequest,
  templateController.deleteTemplatePage
);

/**
 * PUT /api/templates/:templateId/pages/reorder
 * Reorder pages
 */
router.put(
  '/:templateId/pages/reorder',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('pageIds')
      .isArray({ min: 1 })
      .withMessage('Page IDs array is required'),
    body('pageIds.*')
      .isUUID()
      .withMessage('Each page ID must be a valid UUID'),
  ],
  validateRequest,
  templateController.reorderTemplatePages
);

// ==================== Version Management ====================

/**
 * GET /api/templates/:templateId/versions
 * Get version history
 */
router.get(
  '/:templateId/versions',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
  ],
  validateRequest,
  templateController.getTemplateVersions
);

/**
 * POST /api/templates/:templateId/versions
 * Create a new version snapshot
 */
router.post(
  '/:templateId/versions',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('changes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Changes description must be less than 500 characters'),
  ],
  validateRequest,
  templateController.createTemplateVersion
);

/**
 * POST /api/templates/:templateId/versions/:versionId/restore
 * Restore a version
 */
router.post(
  '/:templateId/versions/:versionId/restore',
  [
    param('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    param('versionId')
      .isUUID()
      .withMessage('Invalid version ID'),
  ],
  validateRequest,
  templateController.restoreTemplateVersion
);

export default router;
