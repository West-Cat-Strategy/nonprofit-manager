/**
 * Template Controller
 * HTTP handlers for website builder templates and pages
 */
import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
/**
 * Search and list templates
 */
export declare const searchTemplates: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get a specific template
 */
export declare const getTemplate: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get template CSS variables
 */
export declare const getTemplateCss: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * List available color palettes
 */
export declare const listColorPalettes: (_req: AuthRequest, res: Response) => Promise<void>;
/**
 * List available font pairings
 */
export declare const listFontPairings: (_req: AuthRequest, res: Response) => Promise<void>;
/**
 * Apply a color palette to a template
 */
export declare const applyTemplatePalette: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Apply a font pairing to a template
 */
export declare const applyTemplateFontPairing: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a new template
 */
export declare const createTemplate: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Update a template
 */
export declare const updateTemplate: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Delete a template
 */
export declare const deleteTemplate: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Duplicate a template
 */
export declare const duplicateTemplate: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get system templates
 */
export declare const getSystemTemplates: (_req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get all pages for a template
 */
export declare const getTemplatePages: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get a specific page
 */
export declare const getTemplatePage: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a new page
 */
export declare const createTemplatePage: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Update a page
 */
export declare const updateTemplatePage: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Delete a page
 */
export declare const deleteTemplatePage: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Reorder pages
 */
export declare const reorderTemplatePages: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get version history
 */
export declare const getTemplateVersions: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a new version
 */
export declare const createTemplateVersion: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Restore a version
 */
export declare const restoreTemplateVersion: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Generate preview for a template
 */
export declare const previewTemplate: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=templateController.d.ts.map