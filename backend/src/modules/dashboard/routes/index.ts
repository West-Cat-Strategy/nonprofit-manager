import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams } from '@middleware/zodValidation';
import { uuidSchema, optionalStrictBooleanSchema } from '@validations/shared';
import { createDashboardController } from '../controllers/dashboard.controller';
import { sendSuccess } from '@modules/shared/http/envelope';
import { scopedQueueViewDefinitionSchema } from '@validations/portal';
import {
  archiveQueueViewDefinition,
  listQueueViewDefinitions,
  upsertQueueViewDefinition,
} from '@services/queueViewDefinitionService';

const dashboardIdParamsSchema = z.object({
  id: uuidSchema,
});

const queueViewParamsSchema = z.object({
  viewId: uuidSchema,
});

const createDashboardSchema = z.object({
  name: z.string().trim().min(1, 'Dashboard name is required'),
  is_default: optionalStrictBooleanSchema,
  widgets: z.array(z.unknown()),
  layout: z.array(z.unknown()),
  breakpoints: z.record(z.string(), z.unknown()).optional(),
  cols: z.record(z.string(), z.unknown()).optional(),
});

const updateDashboardSchema = z.object({
  name: z.string().trim().min(1).optional(),
  is_default: optionalStrictBooleanSchema,
  widgets: z.array(z.unknown()).optional(),
  layout: z.array(z.unknown()).optional(),
  breakpoints: z.record(z.string(), z.unknown()).optional(),
  cols: z.record(z.string(), z.unknown()).optional(),
});

const dashboardLayoutSchema = z.object({
  layout: z.array(z.unknown()),
});

export const createDashboardRoutes = (): Router => {
  const router = Router();
  const controller = createDashboardController();

  router.use(authenticate);

  router.get('/queue-views', async (req, res, next) => {
    try {
      const views = await listQueueViewDefinitions('workbench', req.user?.id ?? null, [
        'workbench',
      ]);
      sendSuccess(res, views);
    } catch (error) {
      next(error);
    }
  });
  router.post(
    '/queue-views',
    validateBody(scopedQueueViewDefinitionSchema),
    async (req, res, next) => {
      try {
        const view = await upsertQueueViewDefinition({
          ...(req.body as Parameters<typeof upsertQueueViewDefinition>[0]),
          surface: 'workbench',
          ownerUserId: req.user?.id ?? null,
          permissionScope: ['workbench'],
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
    async (req, res, next) => {
      try {
        const view = await archiveQueueViewDefinition({
          id: String(req.params.viewId),
          surface: 'workbench',
          ownerUserId: req.user?.id ?? null,
          permissionScopes: ['workbench'],
          userId: req.user?.id ?? null,
        });
        sendSuccess(res, view);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get('/configs', controller.getDashboards);
  router.get('/configs/default', controller.getDefaultDashboard);
  router.get('/configs/:id', validateParams(dashboardIdParamsSchema), controller.getDashboard);
  router.post('/configs', validateBody(createDashboardSchema), controller.createDashboard);
  router.put(
    '/configs/:id',
    validateParams(dashboardIdParamsSchema),
    validateBody(updateDashboardSchema),
    controller.updateDashboard
  );
  router.put(
    '/configs/:id/layout',
    validateParams(dashboardIdParamsSchema),
    validateBody(dashboardLayoutSchema),
    controller.updateDashboardLayout
  );
  router.delete(
    '/configs/:id',
    validateParams(dashboardIdParamsSchema),
    controller.deleteDashboard
  );

  return router;
};

export const dashboardV2Routes = createDashboardRoutes();
