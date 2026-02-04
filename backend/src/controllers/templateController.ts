/**
 * Template Controller
 * HTTP handlers for website builder templates and pages
 */

import { Response } from 'express';
import { logger } from '../config/logger';
import * as templateService from '../services/templateService';
import * as themePresetService from '../services/themePresetService';
import type { AuthRequest } from '../middleware/auth';
import type {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreatePageRequest,
  UpdatePageRequest,
  TemplateSearchParams,
  TemplateCategory,
  TemplateStatus,
} from '../types/websiteBuilder';

// ==================== Templates ====================

/**
 * Search and list templates
 */
export const searchTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const params: TemplateSearchParams = {
      search: req.query.search as string,
      category: req.query.category as TemplateCategory,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      status: req.query.status as TemplateStatus,
      isSystemTemplate: req.query.isSystemTemplate === 'true' ? true : req.query.isSystemTemplate === 'false' ? false : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 20,
      sortBy: (req.query.sortBy as 'name' | 'createdAt' | 'updatedAt') || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await templateService.searchTemplates(userId, params);
    res.json(result);
  } catch (error) {
    logger.error('Error searching templates', { error });
    res.status(500).json({ error: 'Failed to search templates' });
  }
};

/**
 * Get a specific template
 */
export const getTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const template = await templateService.getTemplate(templateId, userId);

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    logger.error('Error getting template', { error });
    res.status(500).json({ error: 'Failed to get template' });
  }
};

/**
 * Get template CSS variables
 */
export const getTemplateCss = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const cssVariables = await templateService.getTemplateCssVariables(templateId, userId);
    if (!cssVariables) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ cssVariables });
  } catch (error) {
    logger.error('Error getting template CSS variables', { error });
    res.status(500).json({ error: 'Failed to get template CSS variables' });
  }
};

/**
 * List available color palettes
 */
export const listColorPalettes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const palettes = await themePresetService.listColorPalettes(true);
    res.json(palettes);
  } catch (error) {
    logger.error('Error listing color palettes', { error });
    res.status(500).json({ error: 'Failed to list color palettes' });
  }
};

/**
 * List available font pairings
 */
export const listFontPairings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pairings = await themePresetService.listFontPairings(true);
    res.json(pairings);
  } catch (error) {
    logger.error('Error listing font pairings', { error });
    res.status(500).json({ error: 'Failed to list font pairings' });
  }
};

/**
 * Apply a color palette to a template
 */
export const applyTemplatePalette = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const { paletteId } = req.body as { paletteId?: string };
    if (!paletteId) {
      res.status(400).json({ error: 'paletteId is required' });
      return;
    }

    const palette = await themePresetService.getColorPaletteById(paletteId);
    if (!palette) {
      res.status(404).json({ error: 'Palette not found' });
      return;
    }

    const updated = await templateService.applyPaletteToTemplate(
      templateId,
      userId,
      palette.colors
    );

    if (!updated) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json(updated);
  } catch (error) {
    logger.error('Error applying template palette', { error });
    res.status(500).json({ error: 'Failed to apply palette' });
  }
};

/**
 * Apply a font pairing to a template
 */
export const applyTemplateFontPairing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const { fontPairingId } = req.body as { fontPairingId?: string };
    if (!fontPairingId) {
      res.status(400).json({ error: 'fontPairingId is required' });
      return;
    }

    const pairing = await themePresetService.getFontPairingById(fontPairingId);
    if (!pairing) {
      res.status(404).json({ error: 'Font pairing not found' });
      return;
    }

    const updated = await templateService.applyFontPairingToTemplate(templateId, userId, {
      headingFont: pairing.headingFont,
      bodyFont: pairing.bodyFont,
    });

    if (!updated) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json(updated);
  } catch (error) {
    logger.error('Error applying template font pairing', { error });
    res.status(500).json({ error: 'Failed to apply font pairing' });
  }
};

/**
 * Create a new template
 */
export const createTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { name, description, category, tags, theme, globalSettings, cloneFromId } = req.body as CreateTemplateRequest;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Template name is required' });
      return;
    }

    if (!category) {
      res.status(400).json({ error: 'Template category is required' });
      return;
    }

    const validCategories: TemplateCategory[] = ['landing-page', 'event', 'donation', 'blog', 'multi-page', 'portfolio', 'contact'];
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: 'Invalid template category' });
      return;
    }

    const template = await templateService.createTemplate(userId, {
      name: name.trim(),
      description,
      category,
      tags,
      theme,
      globalSettings,
      cloneFromId,
    });

    res.status(201).json(template);
  } catch (error) {
    logger.error('Error creating template', { error });
    res.status(500).json({ error: 'Failed to create template' });
  }
};

/**
 * Update a template
 */
export const updateTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const data = req.body as UpdateTemplateRequest;

    if (data.category) {
      const validCategories: TemplateCategory[] = ['landing-page', 'event', 'donation', 'blog', 'multi-page', 'portfolio', 'contact'];
      if (!validCategories.includes(data.category)) {
        res.status(400).json({ error: 'Invalid template category' });
        return;
      }
    }

    if (data.status) {
      const validStatuses: TemplateStatus[] = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(data.status)) {
        res.status(400).json({ error: 'Invalid template status' });
        return;
      }
    }

    const template = await templateService.updateTemplate(templateId, userId, data);

    if (!template) {
      res.status(404).json({ error: 'Template not found or access denied' });
      return;
    }

    res.json(template);
  } catch (error) {
    logger.error('Error updating template', { error });
    res.status(500).json({ error: 'Failed to update template' });
  }
};

/**
 * Delete a template
 */
export const deleteTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const success = await templateService.deleteTemplate(templateId, userId);

    if (!success) {
      res.status(404).json({ error: 'Template not found or cannot be deleted' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting template', { error });
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

/**
 * Duplicate a template
 */
export const duplicateTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const { name } = req.body;

    const template = await templateService.duplicateTemplate(templateId, userId, name);

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.status(201).json(template);
  } catch (error) {
    logger.error('Error duplicating template', { error });
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
};

/**
 * Get system templates
 */
export const getSystemTemplates = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const templates = await templateService.getSystemTemplates();
    res.json(templates);
  } catch (error) {
    logger.error('Error getting system templates', { error });
    res.status(500).json({ error: 'Failed to get system templates' });
  }
};

// ==================== Template Pages ====================

/**
 * Get all pages for a template
 */
export const getTemplatePages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;

    // Verify template access
    const template = await templateService.getTemplate(templateId, userId);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const pages = await templateService.getTemplatePages(templateId);
    res.json(pages);
  } catch (error) {
    logger.error('Error getting template pages', { error });
    res.status(500).json({ error: 'Failed to get template pages' });
  }
};

/**
 * Get a specific page
 */
export const getTemplatePage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId, pageId } = req.params;
    const page = await templateService.getTemplatePage(templateId, pageId, userId);

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json(page);
  } catch (error) {
    logger.error('Error getting template page', { error });
    res.status(500).json({ error: 'Failed to get template page' });
  }
};

/**
 * Create a new page
 */
export const createTemplatePage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const { name, slug, isHomepage, seo, sections, cloneFromId } = req.body as CreatePageRequest;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Page name is required' });
      return;
    }

    if (!slug || !slug.trim()) {
      res.status(400).json({ error: 'Page slug is required' });
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
      return;
    }

    const page = await templateService.createTemplatePage(templateId, userId, {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      isHomepage,
      seo,
      sections,
      cloneFromId,
    });

    if (!page) {
      res.status(404).json({ error: 'Template not found or access denied' });
      return;
    }

    res.status(201).json(page);
  } catch (error) {
    logger.error('Error creating template page', { error });

    // Handle unique constraint violation
    if ((error as { code?: string }).code === '23505') {
      res.status(400).json({ error: 'A page with this slug already exists' });
      return;
    }

    res.status(500).json({ error: 'Failed to create template page' });
  }
};

/**
 * Update a page
 */
export const updateTemplatePage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId, pageId } = req.params;
    const data = req.body as UpdatePageRequest;

    // Validate slug format if provided
    if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
      res.status(400).json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
      return;
    }

    const page = await templateService.updateTemplatePage(templateId, pageId, userId, data);

    if (!page) {
      res.status(404).json({ error: 'Page not found or access denied' });
      return;
    }

    res.json(page);
  } catch (error) {
    logger.error('Error updating template page', { error });

    // Handle unique constraint violation
    if ((error as { code?: string }).code === '23505') {
      res.status(400).json({ error: 'A page with this slug already exists' });
      return;
    }

    res.status(500).json({ error: 'Failed to update template page' });
  }
};

/**
 * Delete a page
 */
export const deleteTemplatePage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId, pageId } = req.params;
    const success = await templateService.deleteTemplatePage(templateId, pageId, userId);

    if (!success) {
      res.status(400).json({ error: 'Page not found, access denied, or cannot delete homepage' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting template page', { error });
    res.status(500).json({ error: 'Failed to delete template page' });
  }
};

/**
 * Reorder pages
 */
export const reorderTemplatePages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const { pageIds } = req.body;

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      res.status(400).json({ error: 'Page IDs array is required' });
      return;
    }

    const success = await templateService.reorderTemplatePages(templateId, userId, pageIds);

    if (!success) {
      res.status(404).json({ error: 'Template not found or access denied' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error reordering template pages', { error });
    res.status(500).json({ error: 'Failed to reorder template pages' });
  }
};

// ==================== Version Management ====================

/**
 * Get version history
 */
export const getTemplateVersions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const versions = await templateService.getTemplateVersions(templateId, userId);

    res.json(versions);
  } catch (error) {
    logger.error('Error getting template versions', { error });
    res.status(500).json({ error: 'Failed to get template versions' });
  }
};

/**
 * Create a new version
 */
export const createTemplateVersion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const { changes } = req.body;

    const version = await templateService.createTemplateVersion(templateId, userId, changes);

    if (!version) {
      res.status(404).json({ error: 'Template not found or access denied' });
      return;
    }

    res.status(201).json(version);
  } catch (error) {
    logger.error('Error creating template version', { error });
    res.status(500).json({ error: 'Failed to create template version' });
  }
};

/**
 * Restore a version
 */
export const restoreTemplateVersion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId, versionId } = req.params;
    const template = await templateService.restoreTemplateVersion(templateId, versionId, userId);

    if (!template) {
      res.status(404).json({ error: 'Template or version not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    logger.error('Error restoring template version', { error });
    res.status(500).json({ error: 'Failed to restore template version' });
  }
};

// ==================== Preview ====================

/**
 * Generate preview for a template
 */
export const previewTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { templateId } = req.params;
    const pageSlug = (req.query.page as string) || 'home';

    const preview = await templateService.generateTemplatePreview(templateId, userId, pageSlug);

    if (!preview) {
      res.status(404).json({ error: 'Template or page not found' });
      return;
    }

    // Return HTML directly for rendering in browser
    res.setHeader('Content-Type', 'text/html');
    res.send(preview.html);
  } catch (error) {
    logger.error('Error generating template preview', { error });
    res.status(500).json({ error: 'Failed to generate template preview' });
  }
};
