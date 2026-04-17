import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { requireRole } from '@middleware/permissions';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { isoDateTimeSchema, optionalStrictBooleanSchema, uuidSchema } from '@validations/shared';
import { followUpController as followUpsController } from '@modules/followUps/controllers/followUps.handlers';
import { createTasksController } from '../controllers/tasks.controller';
import { TaskRepository } from '../repositories/taskRepository';
import { TaskCatalogUseCase } from '../usecases/taskCatalog.usecase';
import { TaskLifecycleUseCase } from '../usecases/taskLifecycle.usecase';

const taskStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'waiting',
  'completed',
  'deferred',
  'cancelled',
]);
const taskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
const relatedToTypeSchema = z.enum(['account', 'contact', 'event', 'donation', 'volunteer']);

const dateStringSchema = isoDateTimeSchema;

const taskIdParamsSchema = z.object({
  id: uuidSchema,
});

const createTaskSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required'),
  description: z.string().trim().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: dateStringSchema.optional(),
  assigned_to: uuidSchema.optional(),
  related_to_type: relatedToTypeSchema.optional(),
  related_to_id: uuidSchema.optional(),
});

const updateTaskSchema = z.object({
  subject: z.string().trim().min(1, 'Subject cannot be empty').optional(),
  description: z.string().trim().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: z.union([dateStringSchema, z.null()]).optional(),
  completed_date: z.union([dateStringSchema, z.null()]).optional(),
  assigned_to: z.union([uuidSchema, z.null()]).optional(),
  related_to_type: z.union([relatedToTypeSchema, z.null()]).optional(),
  related_to_id: z.union([uuidSchema, z.null()]).optional(),
});

const taskQuerySchema = z
  .object({
    search: z.string().trim().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assigned_to: uuidSchema.optional(),
    related_to_type: relatedToTypeSchema.optional(),
    related_to_id: uuidSchema.optional(),
    due_before: dateStringSchema.optional(),
    due_after: dateStringSchema.optional(),
    overdue: optionalStrictBooleanSchema,
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const createTasksRoutes = (): Router => {
  const router = Router();

  const repository = new TaskRepository();
  const controller = createTasksController(
    new TaskCatalogUseCase(repository),
    new TaskLifecycleUseCase(repository)
  );

  router.use(authenticate);

  router.get('/', validateQuery(taskQuerySchema), controller.getTasks);
  router.get('/summary', validateQuery(taskQuerySchema), controller.getTaskSummary);
  router.get(
    '/:id/follow-ups',
    requireActiveOrganizationContext,
    validateParams(taskIdParamsSchema),
    followUpsController.getTaskFollowUps
  );
  router.get('/:id', validateParams(taskIdParamsSchema), controller.getTaskById);
  router.post(
    '/',
    validateBody(createTaskSchema),
    requireRole('admin', 'manager', 'staff'),
    controller.createTask
  );
  router.put(
    '/:id',
    validateParams(taskIdParamsSchema),
    validateBody(updateTaskSchema),
    requireRole('admin', 'manager', 'staff'),
    controller.updateTask
  );
  router.delete(
    '/:id',
    validateParams(taskIdParamsSchema),
    requireRole('admin', 'manager', 'staff'),
    controller.deleteTask
  );
  router.post(
    '/:id/complete',
    validateParams(taskIdParamsSchema),
    requireRole('admin', 'manager', 'staff'),
    controller.completeTask
  );

  return router;
};

export const tasksV2Routes = createTasksRoutes();
