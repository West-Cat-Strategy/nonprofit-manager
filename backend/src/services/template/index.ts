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

// Import for default export (backwards compatibility)
import { createTemplate, getTemplate, searchTemplates, updateTemplate, deleteTemplate } from './templateCrud';
import { getTemplatePages, getTemplatePage, createTemplatePage, updateTemplatePage, deleteTemplatePage, reorderTemplatePages } from './templatePages';
import { createTemplateVersion, getTemplateVersions, restoreTemplateVersion } from './templateVersions';
import { getSystemTemplates, duplicateTemplate, generateTemplatePreview, getTemplateCssVariables, applyPaletteToTemplate, applyFontPairingToTemplate } from './templateTheme';

export default {
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
