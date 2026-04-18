/**
 * Registration status controller
 * Public endpoint for querying whether self-registration is available.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth';
import { sendSuccess } from '@modules/shared/http/envelope';
import { getRegistrationMode } from '@modules/admin/usecases/registrationSettingsUseCase';

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
    return sendSuccess(res, { registrationEnabled: mode !== 'disabled', mode });
  } catch (error) {
    next(error);
  }
};
