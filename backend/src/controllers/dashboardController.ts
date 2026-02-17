/**
 * Dashboard Controller
 * HTTP request handlers for dashboard configuration
 */

import { Response, NextFunction } from 'express';
import { services } from '../container/services';
import { AuthRequest } from '@middleware/auth';
import type { CreateDashboardDTO, UpdateDashboardDTO } from '@app-types/dashboard';
import { badRequest, notFoundMessage } from '@utils/responseHelpers';

const dashboardService = services.dashboard;

/**
 * GET /api/dashboard/configs
 * Get all dashboard configurations for current user
 */
export const getDashboards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dashboards = await dashboardService.getUserDashboards(req.user!.id);
    res.json(dashboards);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/configs/:id
 * Get a specific dashboard configuration
 */
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const dashboard = await dashboardService.getDashboard(id, req.user!.id);

    if (!dashboard) {
      notFoundMessage(res, 'Dashboard configuration not found');
      return;
    }

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/configs/default
 * Get user's default dashboard
 */
export const getDefaultDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let dashboard = await dashboardService.getDefaultDashboard(req.user!.id);

    // If no default dashboard exists, create one
    if (!dashboard) {
      dashboard = await dashboardService.createDefaultDashboard(req.user!.id);
    }

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dashboard/configs
 * Create a new dashboard configuration
 */
export const createDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateDashboardDTO = {
      ...req.body,
      user_id: req.user!.id, // Override user_id with authenticated user
    };

    const dashboard = await dashboardService.createDashboard(data);
    res.status(201).json(dashboard);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/dashboard/configs/:id
 * Update dashboard configuration
 */
export const updateDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateDashboardDTO = req.body;

    const dashboard = await dashboardService.updateDashboard(id, req.user!.id, data);

    if (!dashboard) {
      notFoundMessage(res, 'Dashboard configuration not found');
      return;
    }

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/dashboard/configs/:id/layout
 * Update only the layout of a dashboard
 */
export const updateDashboardLayout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { layout } = req.body;

    if (!Array.isArray(layout)) {
      badRequest(res, 'Layout must be an array');
      return;
    }

    const dashboard = await dashboardService.updateDashboardLayout(id, req.user!.id, layout);

    if (!dashboard) {
      notFoundMessage(res, 'Dashboard configuration not found');
      return;
    }

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/dashboard/configs/:id
 * Delete dashboard configuration
 */
export const deleteDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if this is the default dashboard
    const dashboard = await dashboardService.getDashboard(id, req.user!.id);
    if (dashboard?.is_default) {
      badRequest(res, 'Cannot delete default dashboard. Set another dashboard as default first.');
      return;
    }

    const deleted = await dashboardService.deleteDashboard(id, req.user!.id);

    if (!deleted) {
      notFoundMessage(res, 'Dashboard configuration not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboards,
  getDashboard,
  getDefaultDashboard,
  createDashboard,
  updateDashboard,
  updateDashboardLayout,
  deleteDashboard,
};