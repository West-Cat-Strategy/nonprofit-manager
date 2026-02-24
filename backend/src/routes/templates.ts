/**
 * Template Routes
 * Express routes for website builder templates and pages
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import * as templateController from '@controllers/domains/operations';
import { uuidSchema } from '@validations/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

const validCategories = ['landing-page', 'event', 'donation', 'blog', 'multi-page', 'portfolio', 'contact'] as const;
const validStatuses = ['draft', 'published', 'archived'] as const;

const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

const templateIdParamsSchema = z.object({
  templateId: uuidSchema,
});

const templatePageParamsSchema = z.object({
  templateId: uuidSchema,
  pageId: uuidSchema,
});

const templateVersionParamsSchema = z.object({
  templateId: uuidSchema,
  versionId: uuidSchema,
});

const searchTemplatesQuerySchema = z.object({
  search: z.string().max(100).optional(),
  category: z.enum(validCategories).optional(),
  status: z.enum(validStatuses).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const previewTemplateQuerySchema = z.object({
  page: z.string().optional(),
});

const applyPaletteSchema = z.object({
  paletteId: uuidSchema,
});

const applyFontPairingSchema = z.object({
  fontPairingId: uuidSchema,
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: z.enum(validCategories),
  tags: z.array(z.string().max(50)).optional(),
  cloneFromId: uuidSchema.optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(validCategories).optional(),
  status: z.enum(validStatuses).optional(),
  tags: z.array(z.string()).optional(),
});

const duplicateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

const createTemplatePageSchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema,
  isHomepage: z.coerce.boolean().optional(),
  cloneFromId: uuidSchema.optional(),
});

const updateTemplatePageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: slugSchema.optional(),
  isHomepage: z.coerce.boolean().optional(),
});

const reorderTemplatePagesSchema = z.object({
  pageIds: z.array(uuidSchema).min(1),
});

const createTemplateVersionSchema = z.object({
  changes: z.string().max(500).optional(),
});

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
router.get('/', validateQuery(searchTemplatesQuerySchema), templateController.searchTemplates);

/**
 * GET /api/templates/:templateId/css
 * Get CSS variables for a template theme
 */
router.get('/:templateId/css', validateParams(templateIdParamsSchema), templateController.getTemplateCss);

/**
 * GET /api/templates/:templateId
 * Get a specific template
 */
router.get('/:templateId', validateParams(templateIdParamsSchema), templateController.getTemplate);

/**
 * GET /api/templates/:templateId/preview
 * Generate preview for a template
 */
router.get(
  '/:templateId/preview',
  validateParams(templateIdParamsSchema),
  validateQuery(previewTemplateQuerySchema),
  templateController.previewTemplate
);

/**
 * POST /api/templates/:templateId/apply-palette
 * Apply a color palette to a template
 */
router.post(
  '/:templateId/apply-palette',
  validateParams(templateIdParamsSchema),
  validateBody(applyPaletteSchema),
  templateController.applyTemplatePalette
);

/**
 * POST /api/templates/:templateId/apply-font
 * Apply a font pairing to a template
 */
router.post(
  '/:templateId/apply-font',
  validateParams(templateIdParamsSchema),
  validateBody(applyFontPairingSchema),
  templateController.applyTemplateFontPairing
);

/**
 * POST /api/templates
 * Create a new template
 */
router.post('/', validateBody(createTemplateSchema), templateController.createTemplate);

/**
 * PUT /api/templates/:templateId
 * Update a template
 */
router.put('/:templateId', validateParams(templateIdParamsSchema), validateBody(updateTemplateSchema), templateController.updateTemplate);

/**
 * DELETE /api/templates/:templateId
 * Delete a template
 */
router.delete('/:templateId', validateParams(templateIdParamsSchema), templateController.deleteTemplate);

/**
 * POST /api/templates/:templateId/duplicate
 * Duplicate a template
 */
router.post(
  '/:templateId/duplicate',
  validateParams(templateIdParamsSchema),
  validateBody(duplicateTemplateSchema),
  templateController.duplicateTemplate
);

// ==================== Template Pages ====================

/**
 * GET /api/templates/:templateId/pages
 * Get all pages for a template
 */
router.get('/:templateId/pages', validateParams(templateIdParamsSchema), templateController.getTemplatePages);

/**
 * GET /api/templates/:templateId/pages/:pageId
 * Get a specific page
 */
router.get('/:templateId/pages/:pageId', validateParams(templatePageParamsSchema), templateController.getTemplatePage);

/**
 * POST /api/templates/:templateId/pages
 * Create a new page
 */
router.post(
  '/:templateId/pages',
  validateParams(templateIdParamsSchema),
  validateBody(createTemplatePageSchema),
  templateController.createTemplatePage
);

/**
 * PUT /api/templates/:templateId/pages/:pageId
 * Update a page
 */
router.put(
  '/:templateId/pages/:pageId',
  validateParams(templatePageParamsSchema),
  validateBody(updateTemplatePageSchema),
  templateController.updateTemplatePage
);

/**
 * DELETE /api/templates/:templateId/pages/:pageId
 * Delete a page
 */
router.delete('/:templateId/pages/:pageId', validateParams(templatePageParamsSchema), templateController.deleteTemplatePage);

/**
 * PUT /api/templates/:templateId/pages/reorder
 * Reorder pages
 */
router.put(
  '/:templateId/pages/reorder',
  validateParams(templateIdParamsSchema),
  validateBody(reorderTemplatePagesSchema),
  templateController.reorderTemplatePages
);

// ==================== Version Management ====================

/**
 * GET /api/templates/:templateId/versions
 * Get version history
 */
router.get('/:templateId/versions', validateParams(templateIdParamsSchema), templateController.getTemplateVersions);

/**
 * POST /api/templates/:templateId/versions
 * Create a new version snapshot
 */
router.post(
  '/:templateId/versions',
  validateParams(templateIdParamsSchema),
  validateBody(createTemplateVersionSchema),
  templateController.createTemplateVersion
);

/**
 * POST /api/templates/:templateId/versions/:versionId/restore
 * Restore a version
 */
router.post(
  '/:templateId/versions/:versionId/restore',
  validateParams(templateVersionParamsSchema),
  templateController.restoreTemplateVersion
);

export default router;
