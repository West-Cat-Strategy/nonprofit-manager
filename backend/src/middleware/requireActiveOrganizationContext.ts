import { Response, NextFunction } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendError } from '@modules/shared/http/envelope';
import { requireActiveOrganizationSafe } from '@services/authGuardService';
import { setRequestContext } from '@config/requestContext';
import { logger } from '@config/logger';

export const requireActiveOrganizationContext = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await requireActiveOrganizationSafe(req);

  if (!result.ok) {
    logger.info('Active organization context check failed', {
      code: result.error.code,
      status: result.error.statusCode,
      message: result.error.message,
      path: req.path,
      correlationId: req.correlationId
    });
    sendError(
      res,
      result.error.code,
      result.error.message,
      result.error.statusCode,
      undefined,
      req.correlationId
    );
    return;
  }

  req.organizationId = result.data.organizationId;
  req.accountId = result.data.organizationId;
  req.tenantId = result.data.organizationId;
  setRequestContext({
    organizationId: result.data.organizationId,
    accountId: result.data.organizationId,
    tenantId: result.data.organizationId,
  });
  next();
};

export default requireActiveOrganizationContext;
