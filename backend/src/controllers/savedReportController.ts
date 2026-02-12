/**
 * Saved Report Controller
 * Handles HTTP requests for saved report management
 */

import { Response, NextFunction } from 'express';
import { services } from '../container/services';
import { AuthRequest } from '@middleware/auth';
import type { CreateSavedReportRequest, UpdateSavedReportRequest } from '@app-types/savedReport';
import { badRequest, notFoundMessage, unauthorized } from '@utils/responseHelpers';

const savedReportService = services.savedReport;

/**
 * GET /api/saved-reports
 * Get all saved reports for current user
 */
export const getSavedReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const entity = req.query.entity as string | undefined;

    const reports = await savedReportService.getSavedReports(userId, entity);
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/saved-reports/:id
 * Get a specific saved report by ID
 */
export const getSavedReportById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const report = await savedReportService.getSavedReportById(id, userId);

    if (!report) {
      notFoundMessage(res, 'Saved report not found or access denied');
      return;
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/saved-reports
 * Create a new saved report
 */
export const createSavedReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const data: CreateSavedReportRequest = req.body;

    // Validate required fields
    if (!data.name || !data.entity || !data.report_definition) {
      badRequest(res, 'Name, entity, and report_definition are required');
      return;
    }

    const report = await savedReportService.createSavedReport(userId, data);
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/saved-reports/:id
 * Update an existing saved report
 */
export const updateSavedReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const data: UpdateSavedReportRequest = req.body;

    const report = await savedReportService.updateSavedReport(id, userId, data);

    if (!report) {
      notFoundMessage(res, 'Saved report not found or access denied');
      return;
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/saved-reports/:id
 * Delete a saved report
 */
export const deleteSavedReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const success = await savedReportService.deleteSavedReport(id, userId);

    if (!success) {
      notFoundMessage(res, 'Saved report not found or access denied');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export default {
  getSavedReports,
  getSavedReportById,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
};