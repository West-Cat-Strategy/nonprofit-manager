/**
 * Registration Settings Controller
 * Endpoints for managing registration settings (admin) and querying
 * registration status (public), plus the pending-registration approval workflow.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth';
import { logger } from '@config/logger';
import {
  getRegistrationSettings,
  getRegistrationMode,
  updateRegistrationSettings,
} from '@services/registrationSettingsService';
import {
  listPendingRegistrations,
  approvePendingRegistration,
  rejectPendingRegistration,
} from '@services/pendingRegistrationService';

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * GET /api/auth/registration-status
 * Public (no auth required) — the login page calls this to decide whether to
 * show a "Register" button.
 */
export const getRegistrationStatus = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const mode = await getRegistrationMode();
    return res.json({ registrationEnabled: mode !== 'disabled', mode });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Admin — registration settings
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/registration-settings
 */
export const getRegistrationSettingsHandler = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const settings = await getRegistrationSettings();
    return res.json(settings);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/registration-settings
 */
export const updateRegistrationSettingsHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { registrationMode, defaultRole } = req.body;
    const userId = req.user?.id;
    const updated = await updateRegistrationSettings(
      { registrationMode, defaultRole },
      userId
    );
    logger.info(`Registration settings updated by user ${userId}`);
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Admin — pending registrations
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/pending-registrations
 */
export const listPendingRegistrationsHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const status = req.query.status as string | undefined;
    const validStatuses = ['pending', 'approved', 'rejected'];
    const filterStatus = status && validStatuses.includes(status) ? status as 'pending' | 'approved' | 'rejected' : undefined;
    const items = await listPendingRegistrations(filterStatus);
    return res.json({ data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/pending-registrations/:id/approve
 */
export const approvePendingRegistrationHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params as { id: string };
    const reviewedBy = req.user?.id;
    if (!reviewedBy) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }
    const result = await approvePendingRegistration(id, reviewedBy);
    return res.json({ message: 'Registration approved', user: result.user });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: { message: error.message } });
    }
    if (error instanceof Error && (error.message.includes('already been') || error.message.includes('already exists'))) {
      return res.status(409).json({ error: { message: error.message } });
    }
    next(error);
  }
};

/**
 * POST /api/admin/pending-registrations/:id/reject
 */
export const rejectPendingRegistrationHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params as { id: string };
    const reviewedBy = req.user?.id;
    if (!reviewedBy) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }
    const { reason } = req.body;
    const result = await rejectPendingRegistration(id, reviewedBy, reason);
    return res.json({ message: 'Registration rejected', data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: { message: error.message } });
    }
    if (error instanceof Error && error.message.includes('already been')) {
      return res.status(409).json({ error: { message: error.message } });
    }
    next(error);
  }
};
