/**
 * Template Service
 * Handles template CRUD operations and version management
 */
import type { Template, TemplateListItem, TemplatePage, TemplateVersion, TemplateTheme, TemplateSearchParams, TemplateSearchResponse, CreateTemplateRequest, UpdateTemplateRequest, CreatePageRequest, UpdatePageRequest } from '../types/websiteBuilder';
import type { GeneratedPage } from '../types/publishing';
import type { ColorPalette } from '../types/websiteBuilder';
/**
 * Generate CSS variables from a template theme
 */
export declare function generateThemeCssVariables(theme: TemplateTheme): string;
/**
 * Create a new template
 */
export declare function createTemplate(userId: string, data: CreateTemplateRequest): Promise<Template>;
/**
 * Get a template by ID
 */
export declare function getTemplate(templateId: string, userId?: string): Promise<Template | null>;
/**
 * Search and list templates
 */
export declare function searchTemplates(userId: string, params: TemplateSearchParams): Promise<TemplateSearchResponse>;
/**
 * Update a template
 */
export declare function updateTemplate(templateId: string, userId: string, data: UpdateTemplateRequest): Promise<Template | null>;
/**
 * Delete a template
 */
export declare function deleteTemplate(templateId: string, userId: string): Promise<boolean>;
/**
 * Get all pages for a template
 */
export declare function getTemplatePages(templateId: string): Promise<TemplatePage[]>;
/**
 * Get a specific page
 */
export declare function getTemplatePage(templateId: string, pageId: string, userId?: string): Promise<TemplatePage | null>;
/**
 * Create a new page in a template
 */
export declare function createTemplatePage(templateId: string, userId: string, data: CreatePageRequest): Promise<TemplatePage | null>;
/**
 * Update a page
 */
export declare function updateTemplatePage(templateId: string, pageId: string, userId: string, data: UpdatePageRequest): Promise<TemplatePage | null>;
/**
 * Delete a page
 */
export declare function deleteTemplatePage(templateId: string, pageId: string, userId: string): Promise<boolean>;
/**
 * Reorder pages
 */
export declare function reorderTemplatePages(templateId: string, userId: string, pageIds: string[]): Promise<boolean>;
/**
 * Create a new version snapshot
 */
export declare function createTemplateVersion(templateId: string, userId: string, changes?: string): Promise<TemplateVersion | null>;
/**
 * Get version history for a template
 */
export declare function getTemplateVersions(templateId: string, userId: string): Promise<TemplateVersion[]>;
/**
 * Restore a template to a specific version
 */
export declare function restoreTemplateVersion(templateId: string, versionId: string, userId: string): Promise<Template | null>;
/**
 * Get all system templates (for browsing)
 */
export declare function getSystemTemplates(): Promise<TemplateListItem[]>;
/**
 * Duplicate a template (for users to customize)
 */
export declare function duplicateTemplate(templateId: string, userId: string, newName?: string): Promise<Template | null>;
/**
 * Generate a preview of a template
 */
export declare function generateTemplatePreview(templateId: string, userId: string, pageSlug?: string): Promise<GeneratedPage | null>;
export declare function getTemplateCssVariables(templateId: string, userId: string): Promise<string | null>;
export declare function applyPaletteToTemplate(templateId: string, userId: string, palette: ColorPalette): Promise<Template | null>;
export declare function applyFontPairingToTemplate(templateId: string, userId: string, pairing: {
    headingFont: string;
    bodyFont: string;
}): Promise<Template | null>;
declare const _default: {
    createTemplate: typeof createTemplate;
    getTemplate: typeof getTemplate;
    searchTemplates: typeof searchTemplates;
    updateTemplate: typeof updateTemplate;
    deleteTemplate: typeof deleteTemplate;
    getTemplatePages: typeof getTemplatePages;
    getTemplatePage: typeof getTemplatePage;
    createTemplatePage: typeof createTemplatePage;
    updateTemplatePage: typeof updateTemplatePage;
    deleteTemplatePage: typeof deleteTemplatePage;
    reorderTemplatePages: typeof reorderTemplatePages;
    createTemplateVersion: typeof createTemplateVersion;
    getTemplateVersions: typeof getTemplateVersions;
    restoreTemplateVersion: typeof restoreTemplateVersion;
    getSystemTemplates: typeof getSystemTemplates;
    duplicateTemplate: typeof duplicateTemplate;
    generateTemplatePreview: typeof generateTemplatePreview;
    getTemplateCssVariables: typeof getTemplateCssVariables;
    applyPaletteToTemplate: typeof applyPaletteToTemplate;
    applyFontPairingToTemplate: typeof applyFontPairingToTemplate;
};
export default _default;
//# sourceMappingURL=templateService.d.ts.map