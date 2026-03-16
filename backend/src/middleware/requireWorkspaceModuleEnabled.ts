import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendError } from '@modules/shared/http/envelope';
import { requireActiveOrganizationSafe } from '@services/authGuardService';
import { getOrganizationWorkspaceModuleEnabled } from '@modules/admin/lib/organizationSettingsStore';
import type { WorkspaceModuleKey } from '@app-types/workspaceModules';

export const requireWorkspaceModuleEnabled =
  (moduleKey: WorkspaceModuleKey) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let organizationId = req.organizationId || req.accountId || req.tenantId;

    // Preserve the pre-module-guard contract: guarded routes still work without an
    // explicit organization context, while org-scoped requests remain enforceable.
    if (!organizationId) {
      next();
      return;
    }

    const orgContextValidated =
      req.organizationContextValidated?.organizationId === organizationId &&
      req.organizationContextValidated.isActive;

    if (!orgContextValidated) {
      const orgResult = await requireActiveOrganizationSafe(req);
      if (!orgResult.ok) {
        sendError(
          res,
          orgResult.error.code,
          orgResult.error.message,
          orgResult.error.statusCode,
          undefined,
          req.correlationId
        );
        return;
      }

      organizationId = orgResult.data.organizationId;
    }

    const enabled = await getOrganizationWorkspaceModuleEnabled(organizationId, moduleKey);

    if (!enabled) {
      sendError(
        res,
        'MODULE_DISABLED',
        'This module is disabled for the current workspace',
        404,
        { module: moduleKey },
        req.correlationId
      );
      return;
    }

    next();
  };

export default requireWorkspaceModuleEnabled;
