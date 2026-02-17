/**
 * Report Sharing Controller
 * API endpoints for report sharing functionality
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth';
import { services } from '../container/services';
import { badRequest } from '@utils/responseHelpers';

const savedReportService = services.savedReport;

/**
 * POST /api/reports/:id/share
 * Share report with users or roles
 */
export const shareReport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { user_ids, role_names, share_settings } = req.body;

        const report = await savedReportService.shareReport(
            id,
            user_ids,
            role_names,
            share_settings
        );

        res.json(report);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/reports/:id/share
 * Remove share access
 */
export const removeShare = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { user_ids, role_names } = req.body;

        const report = await savedReportService.removeShare(id, user_ids, role_names);
        res.json(report);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/reports/:id/public-link
 * Generate public shareable link
 */
export const generatePublicLink = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { expires_at } = req.body;

        const token = await savedReportService.generatePublicLink(id, expires_at);
        res.json({ token, url: `/public/reports/${token}` });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/reports/:id/public-link
 * Revoke public link
 */
export const revokePublicLink = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        await savedReportService.revokePublicLink(id);
        res.json({ message: 'Public link revoked successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/public/reports/:token
 * Get report by public token (no auth required)
 */
export const getReportByPublicToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = String(req.params.token);
        const report = await savedReportService.getReportByPublicToken(token);

        if (!report) {
            badRequest(res, 'Report not found or link has expired');
            return;
        }

        res.json(report);
    } catch (error) {
        next(error);
    }
};

export default {
    shareReport,
    removeShare,
    generatePublicLink,
    revokePublicLink,
    getReportByPublicToken,
};
