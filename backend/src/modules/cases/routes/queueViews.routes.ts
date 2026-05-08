import type { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '@middleware/zodValidation';
import {
  registerQueueViewRoutes,
  type UpsertQueueViewDefinitionInput,
} from '@modules/shared/queueViews';
import { requirePermission } from '@middleware/permissions';
import { scopedQueueViewDefinitionSchema } from '@validations/portal';
import { uuidSchema } from '@validations/shared';
import { Permission } from '@utils/permissions';

const queueViewParamsSchema = z.object({
  viewId: uuidSchema,
});

export const registerCaseQueueViewRoutes = (router: Router): void => {
  registerQueueViewRoutes(router, {
    list: {
      middleware: [requirePermission(Permission.CASE_VIEW)],
      resolve: (req) => ({
        surface: 'cases',
        ownerUserId: req.user?.id ?? null,
        permissionScopes: ['cases'],
      }),
    },
    upsert: {
      middleware: [
        validateBody(scopedQueueViewDefinitionSchema),
        requirePermission(Permission.CASE_VIEW),
      ],
      resolve: (req) => ({
        ...(req.body as UpsertQueueViewDefinitionInput),
        surface: 'cases',
        ownerUserId: req.user?.id ?? null,
        permissionScope: ['cases'],
        userId: req.user?.id ?? null,
      }),
    },
    archive: {
      path: '/queue-views/:viewId',
      middleware: [
        validateParams(queueViewParamsSchema),
        requirePermission(Permission.CASE_VIEW),
      ],
      resolve: (req) => ({
        id: String(req.params.viewId),
        surface: 'cases',
        ownerUserId: req.user?.id ?? null,
        permissionScopes: ['cases'],
        userId: req.user?.id ?? null,
      }),
    },
  });
};
