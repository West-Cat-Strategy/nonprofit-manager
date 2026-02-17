/**
 * Alert Controller
 * HTTP request handlers for alert configuration
 */

import { Response, NextFunction } from 'express';
import { services } from '../container/services';
import { AuthRequest } from '@middleware/auth';
import type { CreateAlertDTO, UpdateAlertDTO } from '@app-types/alert';
import { notFoundMessage } from '@utils/responseHelpers';

const alertService = services.alert;

/**
 * GET /api/alerts/configs
 * Get all alert configurations for current user
 */
export const getAlertConfigs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alerts = await alertService.getUserAlerts(req.user!.id);
    res.json(alerts);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/alerts/configs/:id
 * Get a specific alert configuration
 */
export const getAlertConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const alert = await alertService.getAlert(id, req.user!.id);

    if (!alert) {
      notFoundMessage(res, 'Alert configuration not found');
      return;
    }

    res.json(alert);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/alerts/configs
 * Create a new alert configuration
 */
export const createAlertConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateAlertDTO = {
      ...req.body,
      user_id: req.user!.id,
    };

    const alert = await alertService.createAlert(data);
    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/alerts/configs/:id
 * Update alert configuration
 */
export const updateAlertConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateAlertDTO = req.body;

    const alert = await alertService.updateAlert(id, req.user!.id, data);

    if (!alert) {
      notFoundMessage(res, 'Alert configuration not found');
      return;
    }

    res.json(alert);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/alerts/configs/:id
 * Delete alert configuration
 */
export const deleteAlertConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await alertService.deleteAlert(id, req.user!.id);

    if (!deleted) {
      notFoundMessage(res, 'Alert configuration not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/alerts/configs/:id/toggle
 * Toggle alert enabled status
 */
export const toggleAlertConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const alert = await alertService.toggleAlert(id, req.user!.id);

    if (!alert) {
      notFoundMessage(res, 'Alert configuration not found');
      return;
    }

    res.json(alert);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/alerts/test
 * Test alert configuration without saving
 */
export const testAlertConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateAlertDTO = {
      ...req.body,
      user_id: req.user!.id,
    };

    const result = await alertService.testAlert(data);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/alerts/instances
 * Get alert instances (triggered alerts)
 */
export const getAlertInstances = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      severity: req.query.severity as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const instances = await alertService.getAlertInstances(filters);
    res.json(instances);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/alerts/instances/:id/acknowledge
 * Acknowledge an alert instance
 */
export const acknowledgeAlert = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const instance = await alertService.acknowledgeAlert(id, req.user!.id);

    if (!instance) {
      notFoundMessage(res, 'Alert instance not found');
      return;
    }

    res.json(instance);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/alerts/instances/:id/resolve
 * Resolve an alert instance
 */
export const resolveAlert = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const instance = await alertService.resolveAlert(id);

    if (!instance) {
      notFoundMessage(res, 'Alert instance not found');
      return;
    }

    res.json(instance);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/alerts/stats
 * Get alert statistics for current user
 */
export const getAlertStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await alertService.getAlertStats(req.user!.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export default {
  getAlertConfigs,
  getAlertConfig,
  createAlertConfig,
  updateAlertConfig,
  deleteAlertConfig,
  toggleAlertConfig,
  testAlertConfig,
  getAlertInstances,
  acknowledgeAlert,
  resolveAlert,
  getAlertStats,
};