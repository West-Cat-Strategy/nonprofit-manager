import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendError } from '@modules/shared/http/envelope';
import { requireActiveOrganizationSafe } from '@services/authGuardService';
import { getAuthenticatedOrganizationId } from './authQueries';

export const resolveAuthenticatedOrganizationId = async (
  req: AuthRequest,
  res: Response
): Promise<string | null | undefined> => {
  const organizationId = req.organizationId || req.accountId || req.tenantId;

  if (!organizationId) {
    if (!req.user?.id) {
      return null;
    }

    const fallbackOrganizationId = await getAuthenticatedOrganizationId(req.user.id);
    if (!fallbackOrganizationId) {
      sendError(
        res,
        'forbidden',
        'No active organization access',
        403,
        undefined,
        req.correlationId
      );
      return undefined;
    }

    return fallbackOrganizationId;
  }

  const result = await requireActiveOrganizationSafe(req);
  if (!result.ok) {
    sendError(
      res,
      result.error.code,
      result.error.message,
      result.error.statusCode,
      undefined,
      req.correlationId
    );
    return undefined;
  }

  return result.data.organizationId;
};
