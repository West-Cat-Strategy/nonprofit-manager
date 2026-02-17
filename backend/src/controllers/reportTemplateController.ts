/**
 * Report Template Controller
 * API endpoints for report template management
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth';
import { services } from '../container/services';
import { badRequest } from '@utils/responseHelpers';

const templateService = services.reportTemplate;

/**
 * GET /api/reports/templates
 * Get all report templates
 */
export const getTemplates = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const category = req.query.category as string | undefined;
        const templates = await templateService.getTemplates(category as any);
        res.json(templates);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/reports/templates/:id
 * Get template by ID
 */
export const getTemplateById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const template = await templateService.getTemplateById(req.params.id);
        if (!template) {
            badRequest(res, 'Template not found');
            return;
        }
        res.json(template);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/reports/templates
 * Create custom template
 */
export const createTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const template = await templateService.createTemplate(req.body);
        res.status(201).json(template);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/reports/templates/:id/instantiate
 * Instantiate template with parameters
 */
export const instantiateTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const definition = await templateService.instantiateTemplate({
            template_id: req.params.id,
            parameter_values: req.body.parameter_values,
            save_as_name: req.body.save_as_name,
        });
        res.json(definition);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/reports/templates/:id
 * Delete custom template
 */
export const deleteTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await templateService.deleteTemplate(req.params.id);
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export default {
    getTemplates,
    getTemplateById,
    createTemplate,
    instantiateTemplate,
    deleteTemplate,
};
