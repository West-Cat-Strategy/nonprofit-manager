import type { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '@middleware/zodValidation';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  archiveQueueViewDefinition,
  listQueueViewDefinitions,
  upsertQueueViewDefinition,
} from '@services/queueViewDefinitionService';
import { requirePermission } from '@middleware/permissions';
import { scopedQueueViewDefinitionSchema } from '@validations/portal';
import { uuidSchema } from '@validations/shared';
import { Permission } from '@utils/permissions';

const queueViewParamsSchema = z.object({
  viewId: uuidSchema,
});

export const registerCaseQueueViewRoutes = (router: Router): void => {
  router.get(
    '/queue-views',
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const views = await listQueueViewDefinitions('cases', req.user?.id ?? null, [
          'cases',
        ]);
        sendSuccess(res, views);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/queue-views',
    validateBody(scopedQueueViewDefinitionSchema),
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const view = await upsertQueueViewDefinition({
          ...(req.body as Parameters<typeof upsertQueueViewDefinition>[0]),
          surface: 'cases',
          ownerUserId: req.user?.id ?? null,
          permissionScope: ['cases'],
          userId: req.user?.id ?? null,
        });
        sendSuccess(res, view, 201);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    '/queue-views/:viewId',
    validateParams(queueViewParamsSchema),
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const view = await archiveQueueViewDefinition({
          id: String(req.params.viewId),
          surface: 'cases',
          ownerUserId: req.user?.id ?? null,
          permissionScopes: ['cases'],
          userId: req.user?.id ?? null,
        });
        sendSuccess(res, view);
      } catch (error) {
        next(error);
      }
    }
  );
};
