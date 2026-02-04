"use strict";
/**
 * Template Controller
 * HTTP handlers for website builder templates and pages
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
exports.previewTemplate = exports.restoreTemplateVersion = exports.createTemplateVersion = exports.getTemplateVersions = exports.reorderTemplatePages = exports.deleteTemplatePage = exports.updateTemplatePage = exports.createTemplatePage = exports.getTemplatePage = exports.getTemplatePages = exports.getSystemTemplates = exports.duplicateTemplate = exports.deleteTemplate = exports.updateTemplate = exports.createTemplate = exports.applyTemplateFontPairing = exports.applyTemplatePalette = exports.listFontPairings = exports.listColorPalettes = exports.getTemplateCss = exports.getTemplate = exports.searchTemplates = void 0;
const logger_1 = require("../config/logger");
const templateService = __importStar(require("../services/templateService"));
const themePresetService = __importStar(require("../services/themePresetService"));
// ==================== Templates ====================
/**
 * Search and list templates
 */
const searchTemplates = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const params = {
            search: req.query.search,
            category: req.query.category,
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
            status: req.query.status,
            isSystemTemplate: req.query.isSystemTemplate === 'true' ? true : req.query.isSystemTemplate === 'false' ? false : undefined,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? Math.min(parseInt(req.query.limit), 100) : 20,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc',
        };
        const result = await templateService.searchTemplates(userId, params);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error searching templates', { error });
        res.status(500).json({ error: 'Failed to search templates' });
    }
};
exports.searchTemplates = searchTemplates;
/**
 * Get a specific template
 */
const getTemplate = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error getting template', { error });
        res.status(500).json({ error: 'Failed to get template' });
    }
};
exports.getTemplate = getTemplate;
/**
 * Get template CSS variables
 */
const getTemplateCss = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error getting template CSS variables', { error });
        res.status(500).json({ error: 'Failed to get template CSS variables' });
    }
};
exports.getTemplateCss = getTemplateCss;
/**
 * List available color palettes
 */
const listColorPalettes = async (_req, res) => {
    try {
        const palettes = await themePresetService.listColorPalettes(true);
        res.json(palettes);
    }
    catch (error) {
        logger_1.logger.error('Error listing color palettes', { error });
        res.status(500).json({ error: 'Failed to list color palettes' });
    }
};
exports.listColorPalettes = listColorPalettes;
/**
 * List available font pairings
 */
const listFontPairings = async (_req, res) => {
    try {
        const pairings = await themePresetService.listFontPairings(true);
        res.json(pairings);
    }
    catch (error) {
        logger_1.logger.error('Error listing font pairings', { error });
        res.status(500).json({ error: 'Failed to list font pairings' });
    }
};
exports.listFontPairings = listFontPairings;
/**
 * Apply a color palette to a template
 */
const applyTemplatePalette = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { templateId } = req.params;
        const { paletteId } = req.body;
        if (!paletteId) {
            res.status(400).json({ error: 'paletteId is required' });
            return;
        }
        const palette = await themePresetService.getColorPaletteById(paletteId);
        if (!palette) {
            res.status(404).json({ error: 'Palette not found' });
            return;
        }
        const updated = await templateService.applyPaletteToTemplate(templateId, userId, palette.colors);
        if (!updated) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }
        res.json(updated);
    }
    catch (error) {
        logger_1.logger.error('Error applying template palette', { error });
        res.status(500).json({ error: 'Failed to apply palette' });
    }
};
exports.applyTemplatePalette = applyTemplatePalette;
/**
 * Apply a font pairing to a template
 */
const applyTemplateFontPairing = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { templateId } = req.params;
        const { fontPairingId } = req.body;
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
    }
    catch (error) {
        logger_1.logger.error('Error applying template font pairing', { error });
        res.status(500).json({ error: 'Failed to apply font pairing' });
    }
};
exports.applyTemplateFontPairing = applyTemplateFontPairing;
/**
 * Create a new template
 */
const createTemplate = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { name, description, category, tags, theme, globalSettings, cloneFromId } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ error: 'Template name is required' });
            return;
        }
        if (!category) {
            res.status(400).json({ error: 'Template category is required' });
            return;
        }
        const validCategories = ['landing-page', 'event', 'donation', 'blog', 'multi-page', 'portfolio', 'contact'];
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
    }
    catch (error) {
        logger_1.logger.error('Error creating template', { error });
        res.status(500).json({ error: 'Failed to create template' });
    }
};
exports.createTemplate = createTemplate;
/**
 * Update a template
 */
const updateTemplate = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { templateId } = req.params;
        const data = req.body;
        if (data.category) {
            const validCategories = ['landing-page', 'event', 'donation', 'blog', 'multi-page', 'portfolio', 'contact'];
            if (!validCategories.includes(data.category)) {
                res.status(400).json({ error: 'Invalid template category' });
                return;
            }
        }
        if (data.status) {
            const validStatuses = ['draft', 'published', 'archived'];
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
    }
    catch (error) {
        logger_1.logger.error('Error updating template', { error });
        res.status(500).json({ error: 'Failed to update template' });
    }
};
exports.updateTemplate = updateTemplate;
/**
 * Delete a template
 */
const deleteTemplate = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error deleting template', { error });
        res.status(500).json({ error: 'Failed to delete template' });
    }
};
exports.deleteTemplate = deleteTemplate;
/**
 * Duplicate a template
 */
const duplicateTemplate = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error duplicating template', { error });
        res.status(500).json({ error: 'Failed to duplicate template' });
    }
};
exports.duplicateTemplate = duplicateTemplate;
/**
 * Get system templates
 */
const getSystemTemplates = async (_req, res) => {
    try {
        const templates = await templateService.getSystemTemplates();
        res.json(templates);
    }
    catch (error) {
        logger_1.logger.error('Error getting system templates', { error });
        res.status(500).json({ error: 'Failed to get system templates' });
    }
};
exports.getSystemTemplates = getSystemTemplates;
// ==================== Template Pages ====================
/**
 * Get all pages for a template
 */
const getTemplatePages = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error getting template pages', { error });
        res.status(500).json({ error: 'Failed to get template pages' });
    }
};
exports.getTemplatePages = getTemplatePages;
/**
 * Get a specific page
 */
const getTemplatePage = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error getting template page', { error });
        res.status(500).json({ error: 'Failed to get template page' });
    }
};
exports.getTemplatePage = getTemplatePage;
/**
 * Create a new page
 */
const createTemplatePage = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { templateId } = req.params;
        const { name, slug, isHomepage, seo, sections, cloneFromId } = req.body;
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
    }
    catch (error) {
        logger_1.logger.error('Error creating template page', { error });
        // Handle unique constraint violation
        if (error.code === '23505') {
            res.status(400).json({ error: 'A page with this slug already exists' });
            return;
        }
        res.status(500).json({ error: 'Failed to create template page' });
    }
};
exports.createTemplatePage = createTemplatePage;
/**
 * Update a page
 */
const updateTemplatePage = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { templateId, pageId } = req.params;
        const data = req.body;
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
    }
    catch (error) {
        logger_1.logger.error('Error updating template page', { error });
        // Handle unique constraint violation
        if (error.code === '23505') {
            res.status(400).json({ error: 'A page with this slug already exists' });
            return;
        }
        res.status(500).json({ error: 'Failed to update template page' });
    }
};
exports.updateTemplatePage = updateTemplatePage;
/**
 * Delete a page
 */
const deleteTemplatePage = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error deleting template page', { error });
        res.status(500).json({ error: 'Failed to delete template page' });
    }
};
exports.deleteTemplatePage = deleteTemplatePage;
/**
 * Reorder pages
 */
const reorderTemplatePages = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error reordering template pages', { error });
        res.status(500).json({ error: 'Failed to reorder template pages' });
    }
};
exports.reorderTemplatePages = reorderTemplatePages;
// ==================== Version Management ====================
/**
 * Get version history
 */
const getTemplateVersions = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { templateId } = req.params;
        const versions = await templateService.getTemplateVersions(templateId, userId);
        res.json(versions);
    }
    catch (error) {
        logger_1.logger.error('Error getting template versions', { error });
        res.status(500).json({ error: 'Failed to get template versions' });
    }
};
exports.getTemplateVersions = getTemplateVersions;
/**
 * Create a new version
 */
const createTemplateVersion = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error creating template version', { error });
        res.status(500).json({ error: 'Failed to create template version' });
    }
};
exports.createTemplateVersion = createTemplateVersion;
/**
 * Restore a version
 */
const restoreTemplateVersion = async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Error restoring template version', { error });
        res.status(500).json({ error: 'Failed to restore template version' });
    }
};
exports.restoreTemplateVersion = restoreTemplateVersion;
// ==================== Preview ====================
/**
 * Generate preview for a template
 */
const previewTemplate = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { templateId } = req.params;
        const pageSlug = req.query.page || 'home';
        const preview = await templateService.generateTemplatePreview(templateId, userId, pageSlug);
        if (!preview) {
            res.status(404).json({ error: 'Template or page not found' });
            return;
        }
        // Return HTML directly for rendering in browser
        res.setHeader('Content-Type', 'text/html');
        res.send(preview.html);
    }
    catch (error) {
        logger_1.logger.error('Error generating template preview', { error });
        res.status(500).json({ error: 'Failed to generate template preview' });
    }
};
exports.previewTemplate = previewTemplate;
//# sourceMappingURL=templateController.js.map