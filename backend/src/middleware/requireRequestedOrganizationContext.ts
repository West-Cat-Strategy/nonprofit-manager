import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendError } from '@modules/shared/http/envelope';

export const requireRequestedOrganizationContext = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.requestedOrganizationId) {
    next();
    return;
  }

  sendError(
    res,
    'bad_request',
    'No organization context',
    400,
    undefined,
    req.correlationId
  );
};

export default requireRequestedOrganizationContext;
