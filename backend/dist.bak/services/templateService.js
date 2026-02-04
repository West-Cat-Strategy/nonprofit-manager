"use strict";
/**
 * Template Service
 * Handles template CRUD operations and version management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateThemeCssVariables = generateThemeCssVariables;
exports.createTemplate = createTemplate;
exports.getTemplate = getTemplate;
exports.searchTemplates = searchTemplates;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
exports.getTemplatePages = getTemplatePages;
exports.getTemplatePage = getTemplatePage;
exports.createTemplatePage = createTemplatePage;
exports.updateTemplatePage = updateTemplatePage;
exports.deleteTemplatePage = deleteTemplatePage;
exports.reorderTemplatePages = reorderTemplatePages;
exports.createTemplateVersion = createTemplateVersion;
exports.getTemplateVersions = getTemplateVersions;
exports.restoreTemplateVersion = restoreTemplateVersion;
exports.getSystemTemplates = getSystemTemplates;
exports.duplicateTemplate = duplicateTemplate;
exports.generateTemplatePreview = generateTemplatePreview;
exports.getTemplateCssVariables = getTemplateCssVariables;
exports.applyPaletteToTemplate = applyPaletteToTemplate;
exports.applyFontPairingToTemplate = applyFontPairingToTemplate;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const siteGeneratorService_1 = require("./siteGeneratorService");
// ==================== Default Theme ====================
const defaultTheme = {
    colors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textMuted: '#64748b',
        border: '#e2e8f0',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
    },
    typography: {
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        headingFontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        baseFontSize: '16px',
        lineHeight: '1.5',
        headingLineHeight: '1.2',
        fontWeightNormal: 400,
        fontWeightMedium: 500,
        fontWeightBold: 700,
    },
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        xxl: '3rem',
    },
    borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '1rem',
        full: '9999px',
    },
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    },
};
const defaultGlobalSettings = {
    language: 'en',
    header: {
        navigation: [],
        sticky: true,
        transparent: false,
    },
    footer: {
        columns: [],
        copyright: `© ${new Date().getFullYear()} Your Organization. All rights reserved.`,
    },
};
// ==================== Helper Functions ====================
/**
 * Map database row to Template object
 */
function mapRowToTemplate(row) {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description || '',
        category: row.category,
        tags: row.tags || [],
        status: row.status,
        isSystemTemplate: row.is_system_template,
        theme: row.theme,
        globalSettings: row.global_settings,
        pages: [], // Pages loaded separately
        metadata: row.metadata,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}
/**
 * Map database row to TemplateListItem
 */
function mapRowToListItem(row) {
    const metadata = row.metadata || {};
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        category: row.category,
        tags: row.tags || [],
        status: row.status,
        isSystemTemplate: row.is_system_template,
        thumbnailImage: metadata.thumbnailImage,
        pageCount: parseInt(row.page_count) || 0,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}
/**
 * Map database row to TemplatePage
 */
function mapRowToPage(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        isHomepage: row.is_homepage,
        seo: row.seo,
        sections: row.sections || [],
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}
/**
 * Increment version string (e.g., '1.0.0' -> '1.0.1')
 */
function incrementVersion(version) {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
}
/**
 * Generate CSS variables from a template theme
 */
function generateThemeCssVariables(theme) {
    const { colors, typography, spacing, borderRadius, shadows } = theme;
    let css = ':root {\n';
    // Colors
    css += `  --color-primary: ${colors.primary};\n`;
    css += `  --color-secondary: ${colors.secondary};\n`;
    css += `  --color-accent: ${colors.accent};\n`;
    css += `  --color-background: ${colors.background};\n`;
    css += `  --color-surface: ${colors.surface};\n`;
    css += `  --color-text: ${colors.text};\n`;
    css += `  --color-text-muted: ${colors.textMuted};\n`;
    css += `  --color-border: ${colors.border};\n`;
    css += `  --color-error: ${colors.error};\n`;
    css += `  --color-success: ${colors.success};\n`;
    css += `  --color-warning: ${colors.warning};\n`;
    // Typography
    css += `  --font-body: ${typography.fontFamily};\n`;
    css += `  --font-heading: ${typography.headingFontFamily};\n`;
    css += `  --font-base-size: ${typography.baseFontSize};\n`;
    css += `  --line-height: ${typography.lineHeight};\n`;
    css += `  --line-height-heading: ${typography.headingLineHeight};\n`;
    css += `  --font-weight-normal: ${typography.fontWeightNormal};\n`;
    css += `  --font-weight-medium: ${typography.fontWeightMedium};\n`;
    css += `  --font-weight-bold: ${typography.fontWeightBold};\n`;
    // Spacing
    css += `  --spacing-xs: ${spacing.xs};\n`;
    css += `  --spacing-sm: ${spacing.sm};\n`;
    css += `  --spacing-md: ${spacing.md};\n`;
    css += `  --spacing-lg: ${spacing.lg};\n`;
    css += `  --spacing-xl: ${spacing.xl};\n`;
    css += `  --spacing-xxl: ${spacing.xxl};\n`;
    // Border radius
    css += `  --radius-sm: ${borderRadius.sm};\n`;
    css += `  --radius-md: ${borderRadius.md};\n`;
    css += `  --radius-lg: ${borderRadius.lg};\n`;
    css += `  --radius-full: ${borderRadius.full};\n`;
    // Shadows
    css += `  --shadow-sm: ${shadows.sm};\n`;
    css += `  --shadow-md: ${shadows.md};\n`;
    css += `  --shadow-lg: ${shadows.lg};\n`;
    css += `  --shadow-xl: ${shadows.xl};\n`;
    css += '}\n';
    return css;
}
// ==================== Template CRUD ====================
/**
 * Create a new template
 */
async function createTemplate(userId, data) {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        let theme = { ...defaultTheme, ...data.theme };
        let globalSettings = { ...defaultGlobalSettings, ...data.globalSettings };
        let pages = [];
        // If cloning from existing template
        if (data.cloneFromId) {
            const sourceResult = await client.query('SELECT * FROM templates WHERE id = $1', [data.cloneFromId]);
            if (sourceResult.rows.length > 0) {
                const source = sourceResult.rows[0];
                theme = { ...source.theme, ...data.theme };
                globalSettings = { ...source.global_settings, ...data.globalSettings };
                // Clone pages
                const pagesResult = await client.query('SELECT * FROM template_pages WHERE template_id = $1 ORDER BY sort_order', [data.cloneFromId]);
                pages = pagesResult.rows.map(mapRowToPage);
            }
        }
        // Create template
        const templateResult = await client.query(`INSERT INTO templates (user_id, name, description, category, tags, theme, global_settings, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [
            userId,
            data.name,
            data.description || '',
            data.category,
            data.tags || [],
            JSON.stringify(theme),
            JSON.stringify(globalSettings),
            JSON.stringify({ version: '1.0.0' }),
        ]);
        const template = mapRowToTemplate(templateResult.rows[0]);
        template.theme = theme;
        template.globalSettings = globalSettings;
        // Clone pages if applicable
        if (pages.length > 0) {
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                await client.query(`INSERT INTO template_pages (template_id, name, slug, is_homepage, seo, sections, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    template.id,
                    page.name,
                    page.slug,
                    page.isHomepage,
                    JSON.stringify(page.seo),
                    JSON.stringify(page.sections),
                    i,
                ]);
            }
        }
        else {
            // Create default homepage
            await client.query(`INSERT INTO template_pages (template_id, name, slug, is_homepage, seo, sections, sort_order)
         VALUES ($1, 'Home', 'home', true, $2, '[]', 0)`, [
                template.id,
                JSON.stringify({ title: data.name, description: data.description || '' }),
            ]);
        }
        await client.query('COMMIT');
        // Fetch pages
        template.pages = await getTemplatePages(template.id);
        logger_1.logger.info('Template created', { templateId: template.id, userId });
        return template;
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger_1.logger.error('Failed to create template', { error, userId });
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * Get a template by ID
 */
async function getTemplate(templateId, userId) {
    // Build query based on whether user is specified
    let query = 'SELECT * FROM templates WHERE id = $1';
    const params = [templateId];
    if (userId) {
        query += ' AND (user_id = $2 OR is_system_template = true)';
        params.push(userId);
    }
    const result = await database_1.default.query(query, params);
    if (result.rows.length === 0) {
        return null;
    }
    const template = mapRowToTemplate(result.rows[0]);
    template.pages = await getTemplatePages(templateId);
    return template;
}
/**
 * Search and list templates
 */
async function searchTemplates(userId, params) {
    const { search, category, tags, status, isSystemTemplate, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = params;
    const conditions = ['(t.user_id = $1 OR t.is_system_template = true)'];
    const queryParams = [userId];
    let paramIndex = 2;
    if (search) {
        conditions.push(`(t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
    }
    if (category) {
        conditions.push(`t.category = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
    }
    if (tags && tags.length > 0) {
        conditions.push(`t.tags && $${paramIndex}`);
        queryParams.push(tags);
        paramIndex++;
    }
    if (status) {
        conditions.push(`t.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
    }
    if (typeof isSystemTemplate === 'boolean') {
        conditions.push(`t.is_system_template = $${paramIndex}`);
        queryParams.push(isSystemTemplate);
        paramIndex++;
    }
    const sortColumn = {
        name: 't.name',
        createdAt: 't.created_at',
        updatedAt: 't.updated_at',
    }[sortBy] || 't.created_at';
    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;
    // Get total count
    const countResult = await database_1.default.query(`SELECT COUNT(*) FROM templates t WHERE ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].count);
    // Get templates with page count
    const templatesResult = await database_1.default.query(`SELECT t.*, COUNT(tp.id) as page_count
     FROM templates t
     LEFT JOIN template_pages tp ON t.id = tp.template_id
     WHERE ${whereClause}
     GROUP BY t.id
     ORDER BY ${sortColumn} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...queryParams, limit, offset]);
    return {
        templates: templatesResult.rows.map(mapRowToListItem),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}
/**
 * Update a template
 */
async function updateTemplate(templateId, userId, data) {
    // First check ownership
    const checkResult = await database_1.default.query('SELECT * FROM templates WHERE id = $1 AND user_id = $2', [templateId, userId]);
    if (checkResult.rows.length === 0) {
        return null;
    }
    const current = checkResult.rows[0];
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
    }
    if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
    }
    if (data.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(data.category);
    }
    if (data.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(data.tags);
    }
    if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
    }
    if (data.theme !== undefined) {
        const mergedTheme = { ...current.theme, ...data.theme };
        updates.push(`theme = $${paramIndex++}`);
        values.push(JSON.stringify(mergedTheme));
    }
    if (data.globalSettings !== undefined) {
        const mergedSettings = { ...current.global_settings, ...data.globalSettings };
        updates.push(`global_settings = $${paramIndex++}`);
        values.push(JSON.stringify(mergedSettings));
    }
    if (updates.length === 0) {
        return getTemplate(templateId, userId);
    }
    values.push(templateId);
    await database_1.default.query(`UPDATE templates SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    logger_1.logger.info('Template updated', { templateId, userId });
    return getTemplate(templateId, userId);
}
/**
 * Delete a template
 */
async function deleteTemplate(templateId, userId) {
    const result = await database_1.default.query('DELETE FROM templates WHERE id = $1 AND user_id = $2 AND is_system_template = false', [templateId, userId]);
    if (result.rowCount && result.rowCount > 0) {
        logger_1.logger.info('Template deleted', { templateId, userId });
        return true;
    }
    return false;
}
// ==================== Template Pages ====================
/**
 * Get all pages for a template
 */
async function getTemplatePages(templateId) {
    const result = await database_1.default.query('SELECT * FROM template_pages WHERE template_id = $1 ORDER BY sort_order, created_at', [templateId]);
    return result.rows.map(mapRowToPage);
}
/**
 * Get a specific page
 */
async function getTemplatePage(templateId, pageId, userId) {
    // Verify template access
    let query = `
    SELECT tp.* FROM template_pages tp
    JOIN templates t ON tp.template_id = t.id
    WHERE tp.id = $1 AND tp.template_id = $2
  `;
    const params = [pageId, templateId];
    if (userId) {
        query += ' AND (t.user_id = $3 OR t.is_system_template = true)';
        params.push(userId);
    }
    const result = await database_1.default.query(query, params);
    if (result.rows.length === 0) {
        return null;
    }
    return mapRowToPage(result.rows[0]);
}
/**
 * Create a new page in a template
 */
async function createTemplatePage(templateId, userId, data) {
    // Verify ownership
    const checkResult = await database_1.default.query('SELECT id FROM templates WHERE id = $1 AND user_id = $2', [templateId, userId]);
    if (checkResult.rows.length === 0) {
        return null;
    }
    // Get max sort order
    const orderResult = await database_1.default.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM template_pages WHERE template_id = $1', [templateId]);
    const sortOrder = orderResult.rows[0].next_order;
    let sections = data.sections || [];
    let seo = {
        title: data.name,
        description: '',
        ...data.seo,
    };
    // Clone from existing page if specified
    if (data.cloneFromId) {
        const sourceResult = await database_1.default.query('SELECT * FROM template_pages WHERE id = $1', [data.cloneFromId]);
        if (sourceResult.rows.length > 0) {
            const source = sourceResult.rows[0];
            sections = source.sections;
            seo = { ...source.seo, ...data.seo, title: data.seo?.title || data.name };
        }
    }
    const result = await database_1.default.query(`INSERT INTO template_pages (template_id, name, slug, is_homepage, seo, sections, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`, [
        templateId,
        data.name,
        data.slug,
        data.isHomepage || false,
        JSON.stringify(seo),
        JSON.stringify(sections),
        sortOrder,
    ]);
    logger_1.logger.info('Template page created', { templateId, pageId: result.rows[0].id });
    return mapRowToPage(result.rows[0]);
}
/**
 * Update a page
 */
async function updateTemplatePage(templateId, pageId, userId, data) {
    // Verify ownership
    const checkResult = await database_1.default.query(`SELECT tp.* FROM template_pages tp
     JOIN templates t ON tp.template_id = t.id
     WHERE tp.id = $1 AND tp.template_id = $2 AND t.user_id = $3`, [pageId, templateId, userId]);
    if (checkResult.rows.length === 0) {
        return null;
    }
    const current = checkResult.rows[0];
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
    }
    if (data.slug !== undefined) {
        updates.push(`slug = $${paramIndex++}`);
        values.push(data.slug);
    }
    if (data.isHomepage !== undefined) {
        updates.push(`is_homepage = $${paramIndex++}`);
        values.push(data.isHomepage);
    }
    if (data.seo !== undefined) {
        const mergedSeo = { ...current.seo, ...data.seo };
        updates.push(`seo = $${paramIndex++}`);
        values.push(JSON.stringify(mergedSeo));
    }
    if (data.sections !== undefined) {
        updates.push(`sections = $${paramIndex++}`);
        values.push(JSON.stringify(data.sections));
    }
    if (updates.length === 0) {
        return mapRowToPage(current);
    }
    values.push(pageId);
    const result = await database_1.default.query(`UPDATE template_pages SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
    logger_1.logger.info('Template page updated', { templateId, pageId });
    return mapRowToPage(result.rows[0]);
}
/**
 * Delete a page
 */
async function deleteTemplatePage(templateId, pageId, userId) {
    const result = await database_1.default.query(`DELETE FROM template_pages tp
     USING templates t
     WHERE tp.id = $1
       AND tp.template_id = $2
       AND t.id = tp.template_id
       AND t.user_id = $3
       AND tp.is_homepage = false`, [pageId, templateId, userId]);
    if (result.rowCount && result.rowCount > 0) {
        logger_1.logger.info('Template page deleted', { templateId, pageId });
        return true;
    }
    return false;
}
/**
 * Reorder pages
 */
async function reorderTemplatePages(templateId, userId, pageIds) {
    // Verify ownership
    const checkResult = await database_1.default.query('SELECT id FROM templates WHERE id = $1 AND user_id = $2', [templateId, userId]);
    if (checkResult.rows.length === 0) {
        return false;
    }
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < pageIds.length; i++) {
            await client.query('UPDATE template_pages SET sort_order = $1 WHERE id = $2 AND template_id = $3', [i, pageIds[i], templateId]);
        }
        await client.query('COMMIT');
        logger_1.logger.info('Template pages reordered', { templateId });
        return true;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
// ==================== Version Management ====================
/**
 * Create a new version snapshot
 */
async function createTemplateVersion(templateId, userId, changes) {
    const template = await getTemplate(templateId, userId);
    if (!template || template.userId !== userId) {
        return null;
    }
    // Get current version
    const currentResult = await database_1.default.query('SELECT current_version FROM templates WHERE id = $1', [templateId]);
    const currentVersion = currentResult.rows[0]?.current_version || '1.0.0';
    const newVersion = incrementVersion(currentVersion);
    // Create snapshot
    const snapshot = {
        theme: template.theme,
        globalSettings: template.globalSettings,
        pages: template.pages,
    };
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        // Insert version
        const versionResult = await client.query(`INSERT INTO template_versions (template_id, version, changes, snapshot, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [templateId, newVersion, changes, JSON.stringify(snapshot), userId]);
        // Update template current version
        await client.query('UPDATE templates SET current_version = $1 WHERE id = $2', [newVersion, templateId]);
        await client.query('COMMIT');
        logger_1.logger.info('Template version created', { templateId, version: newVersion });
        return {
            id: versionResult.rows[0].id,
            templateId,
            version: newVersion,
            changes,
            createdAt: versionResult.rows[0].created_at.toISOString(),
            createdBy: userId,
            snapshot,
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * Get version history for a template
 */
async function getTemplateVersions(templateId, userId) {
    const result = await database_1.default.query(`SELECT tv.* FROM template_versions tv
     JOIN templates t ON tv.template_id = t.id
     WHERE tv.template_id = $1 AND (t.user_id = $2 OR t.is_system_template = true)
     ORDER BY tv.created_at DESC`, [templateId, userId]);
    return result.rows.map((row) => ({
        id: row.id,
        templateId: row.template_id,
        version: row.version,
        changes: row.changes,
        createdAt: row.created_at.toISOString(),
        createdBy: row.created_by,
        snapshot: row.snapshot,
    }));
}
/**
 * Restore a template to a specific version
 */
async function restoreTemplateVersion(templateId, versionId, userId) {
    // Get version
    const versionResult = await database_1.default.query(`SELECT tv.* FROM template_versions tv
     JOIN templates t ON tv.template_id = t.id
     WHERE tv.id = $1 AND tv.template_id = $2 AND t.user_id = $3`, [versionId, templateId, userId]);
    if (versionResult.rows.length === 0) {
        return null;
    }
    const version = versionResult.rows[0];
    const snapshot = version.snapshot;
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        // Update template theme and settings
        await client.query('UPDATE templates SET theme = $1, global_settings = $2 WHERE id = $3', [JSON.stringify(snapshot.theme), JSON.stringify(snapshot.globalSettings), templateId]);
        // Delete current pages
        await client.query('DELETE FROM template_pages WHERE template_id = $1', [templateId]);
        // Restore pages from snapshot
        for (let i = 0; i < snapshot.pages.length; i++) {
            const page = snapshot.pages[i];
            await client.query(`INSERT INTO template_pages (template_id, name, slug, is_homepage, seo, sections, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                templateId,
                page.name,
                page.slug,
                page.isHomepage,
                JSON.stringify(page.seo),
                JSON.stringify(page.sections),
                i,
            ]);
        }
        await client.query('COMMIT');
        logger_1.logger.info('Template version restored', { templateId, versionId, version: version.version });
        return getTemplate(templateId, userId);
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
// ==================== System Templates ====================
/**
 * Get all system templates (for browsing)
 */
async function getSystemTemplates() {
    const result = await database_1.default.query(`SELECT t.*, COUNT(tp.id) as page_count
     FROM templates t
     LEFT JOIN template_pages tp ON t.id = tp.template_id
     WHERE t.is_system_template = true AND t.status = 'published'
     GROUP BY t.id
     ORDER BY t.category, t.name`);
    return result.rows.map(mapRowToListItem);
}
/**
 * Duplicate a template (for users to customize)
 */
async function duplicateTemplate(templateId, userId, newName) {
    const source = await getTemplate(templateId, userId);
    if (!source) {
        return null;
    }
    return createTemplate(userId, {
        name: newName || `${source.name} (Copy)`,
        description: source.description,
        category: source.category,
        tags: source.tags,
        theme: source.theme,
        globalSettings: source.globalSettings,
        cloneFromId: templateId,
    });
}
/**
 * Generate a preview of a template
 */
async function generateTemplatePreview(templateId, userId, pageSlug = 'home') {
    try {
        // Get template
        const template = await getTemplate(templateId, userId);
        if (!template) {
            return null;
        }
        // Get all pages
        const pages = await getTemplatePages(templateId);
        if (pages.length === 0) {
            return null;
        }
        // Find the requested page
        const requestedPage = pages.find(p => p.slug === pageSlug) || pages.find(p => p.isHomepage) || pages[0];
        if (!requestedPage) {
            return null;
        }
        // Convert template data to PublishedContent format
        const publishedContent = {
            templateId: template.id,
            templateName: template.name,
            theme: convertToPublishedTheme(template.theme),
            pages: pages.map(convertToPublishedPage),
            navigation: {
                items: (template.globalSettings?.header?.navigation || []).map(nav => ({
                    id: nav.id,
                    label: nav.label,
                    url: nav.href,
                    children: nav.children?.map(child => ({
                        id: child.id,
                        label: child.label,
                        url: child.href,
                        openInNewTab: child.isExternal,
                    })),
                    openInNewTab: nav.isExternal,
                })),
                logo: template.globalSettings?.header?.logo,
                logoAlt: template.globalSettings?.header?.logoAlt,
                style: 'horizontal',
                sticky: template.globalSettings?.header?.sticky ?? true,
                transparent: template.globalSettings?.header?.transparent ?? false,
            },
            footer: {
                columns: (template.globalSettings?.footer?.columns || []).map((col, idx) => ({
                    id: `col-${idx}`,
                    title: col.title,
                    links: col.links.map((link, linkIdx) => ({
                        id: `link-${idx}-${linkIdx}`,
                        label: link.label,
                        url: link.href,
                    })),
                })),
                copyright: template.globalSettings?.footer?.copyright || `© ${new Date().getFullYear()} Your Organization`,
                socialLinks: template.globalSettings?.footer?.socialLinks?.map(link => ({
                    platform: link.platform,
                    url: link.url,
                })),
                showNewsletter: template.globalSettings?.footer?.showNewsletter,
                backgroundColor: template.globalSettings?.footer?.backgroundColor,
            },
            seoDefaults: {
                title: template.name,
                description: template.description || '',
                keywords: template.tags || [],
                favicon: template.globalSettings?.favicon || '/favicon.ico',
                ogImage: '',
                googleAnalyticsId: template.globalSettings?.analyticsId || '',
                customHeadCode: '',
            },
            publishedAt: new Date().toISOString(),
            version: '1.0.0-preview',
        };
        // Generate the page using SiteGeneratorService
        const generator = new siteGeneratorService_1.SiteGeneratorService();
        const publishedPage = convertToPublishedPage(requestedPage);
        const generatedPage = generator.generatePage(publishedPage, publishedContent);
        return generatedPage;
    }
    catch (error) {
        logger_1.logger.error('Error generating template preview', { error, templateId, pageSlug });
        return null;
    }
}
/**
 * Convert TemplateTheme to PublishedTheme
 */
function convertToPublishedTheme(theme) {
    return {
        colors: theme.colors,
        typography: theme.typography,
        borderRadius: theme.borderRadius,
        shadows: {
            sm: theme.shadows.sm,
            md: theme.shadows.md,
            lg: theme.shadows.lg,
        },
    };
}
/**
 * Convert TemplatePage to PublishedPage
 */
function convertToPublishedPage(page) {
    return {
        id: page.id,
        slug: page.slug,
        name: page.name,
        isHomepage: page.isHomepage,
        sections: (page.sections || []),
        seo: page.seo || {
            title: page.name,
            description: '',
            keywords: [],
        },
    };
}
async function getTemplateCssVariables(templateId, userId) {
    const template = await getTemplate(templateId, userId);
    if (!template)
        return null;
    return generateThemeCssVariables(template.theme);
}
async function applyPaletteToTemplate(templateId, userId, palette) {
    const template = await getTemplate(templateId, userId);
    if (!template)
        return null;
    const theme = { ...template.theme, colors: { ...template.theme.colors, ...palette } };
    return updateTemplate(templateId, userId, { theme });
}
async function applyFontPairingToTemplate(templateId, userId, pairing) {
    const template = await getTemplate(templateId, userId);
    if (!template)
        return null;
    const theme = {
        ...template.theme,
        typography: {
            ...template.theme.typography,
            headingFontFamily: pairing.headingFont,
            fontFamily: pairing.bodyFont,
        },
    };
    return updateTemplate(templateId, userId, { theme });
}
exports.default = {
    createTemplate,
    getTemplate,
    searchTemplates,
    updateTemplate,
    deleteTemplate,
    getTemplatePages,
    getTemplatePage,
    createTemplatePage,
    updateTemplatePage,
    deleteTemplatePage,
    reorderTemplatePages,
    createTemplateVersion,
    getTemplateVersions,
    restoreTemplateVersion,
    getSystemTemplates,
    duplicateTemplate,
    generateTemplatePreview,
    getTemplateCssVariables,
    applyPaletteToTemplate,
    applyFontPairingToTemplate,
};
//# sourceMappingURL=templateService.js.map