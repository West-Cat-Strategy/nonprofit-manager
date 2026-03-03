import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
import { createDashboardController } from '../controllers/dashboard.controller';
import { type ResponseMode } from '../mappers/responseMode';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardUseCase } from '../usecases/dashboard.usecase';

const dashboardIdParamsSchema = z.object({
  id: uuidSchema,
});

const createDashboardSchema = z.object({
  name: z.string().trim().min(1, 'Dashboard name is required'),
  is_default: z.coerce.boolean().optional(),
  widgets: z.array(z.unknown()),
  layout: z.array(z.unknown()),
  breakpoints: z.record(z.string(), z.unknown()).optional(),
  cols: z.record(z.string(), z.unknown()).optional(),
});

const updateDashboardSchema = z.object({
  name: z.string().trim().min(1).optional(),
  is_default: z.coerce.boolean().optional(),
  widgets: z.array(z.unknown()).optional(),
  layout: z.array(z.unknown()).optional(),
  breakpoints: z.record(z.string(), z.unknown()).optional(),
  cols: z.record(z.string(), z.unknown()).optional(),
});

const dashboardLayoutSchema = z.object({
  layout: z.array(z.unknown()),
});

export const createDashboardRoutes = (mode: ResponseMode = 'v2'): Router => {
  const router = Router();
  const controller = createDashboardController(
    new DashboardUseCase(new DashboardRepository()),
    mode
  );

  router.use(authenticate);

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
  router.delete('/configs/:id', validateParams(dashboardIdParamsSchema), controller.deleteDashboard);

  return router;
};

export const dashboardV2Routes = createDashboardRoutes('v2');
