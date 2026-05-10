/**
 * Template Service
 * Handles template CRUD operations, page management, versioning, and theming
 */

// Re-export all named functions
export { createTemplate, getTemplate, searchTemplates, updateTemplate, deleteTemplate } from './templateCrud';
export { getTemplatePages, getTemplatePage, createTemplatePage, updateTemplatePage, deleteTemplatePage, reorderTemplatePages } from './templatePages';
export { createTemplateVersion, getTemplateVersions, restoreTemplateVersion } from './templateVersions';
export { getSystemTemplates, duplicateTemplate, generateTemplatePreview, getTemplateCssVariables, applyPaletteToTemplate, applyFontPairingToTemplate } from './templateTheme';
export { generateThemeCssVariables } from './helpers';
export { renderMailchimpCampaignPreview, resolveMailchimpCampaignContent } from './emailCampaignRenderer';
