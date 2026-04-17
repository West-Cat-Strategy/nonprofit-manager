import { Router } from 'express';
import { z } from 'zod';
import { optionalStrictBooleanSchema } from '@validations/shared';
import pool from '@config/database';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { documentUpload, handleMulterError } from '@middleware/domains/platform';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  createVolunteerSchema,
  updateVolunteerSchema,
  volunteerAssignmentSchema,
  updateVolunteerAssignmentSchema,
  uuidSchema,
} from '@validations/volunteer';
import { createVolunteersController } from '../controllers/volunteers.controller';
import { VolunteerRepository } from '../repositories/volunteerRepository';
import { VolunteerCatalogUseCase } from '../usecases/volunteerCatalog.usecase';
import { VolunteerImportExportUseCase } from '../usecases/volunteerImportExport.usecase';
import { VolunteerLifecycleUseCase } from '../usecases/volunteerLifecycle.usecase';

const volunteerSkillsQuerySchema = z
  .object({
    skills: z.string().min(1, 'Skills parameter is required'),
  })
  .strict();

const volunteerListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    skills: z.string().optional(),
    availability_status: z.enum(['available', 'unavailable', 'limited']).optional(),
    background_check_status: z
      .enum(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired'])
      .optional(),
    is_active: optionalStrictBooleanSchema,
  })
  .strict();

const volunteerExportSchema = z
  .object({
    format: z.enum(['csv', 'xlsx']),
    ids: z.array(uuidSchema).optional(),
    columns: z.array(z.string().trim().min(1)).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    skills: z.array(z.string().trim().min(1)).optional(),
    availability_status: z.enum(['available', 'unavailable', 'limited']).optional(),
    background_check_status: z
      .enum(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired'])
      .optional(),
    is_active: optionalStrictBooleanSchema,
  })
  .strict();

const importTemplateQuerySchema = z
  .object({
    format: z
      .enum(['csv', 'xlsx', 'xslx'])
      .transform((value) => (value === 'xslx' ? 'xlsx' : value))
      .optional(),
  })
  .strict();

export const createVolunteersRoutes = (): Router => {
  const router = Router();

  const repository = new VolunteerRepository();
  const controller = createVolunteersController(
    new VolunteerCatalogUseCase(repository),
    new VolunteerLifecycleUseCase(repository),
    new VolunteerImportExportUseCase(pool)
  );

  router.use(authenticate);
  router.use(loadDataScope('volunteers'));

  router.get(
    '/search/skills',
    validateQuery(volunteerSkillsQuerySchema),
    controller.findVolunteersBySkills
  );

  router.get('/', validateQuery(volunteerListQuerySchema), controller.getVolunteers);
  router.post(
    '/export',
    requireActiveOrganizationContext,
    validateBody(volunteerExportSchema),
    controller.exportVolunteers
  );
  router.get(
    '/import/template',
    requireActiveOrganizationContext,
    validateQuery(importTemplateQuerySchema),
    controller.downloadImportTemplate
  );
  router.post(
    '/import/preview',
    requireActiveOrganizationContext,
    documentUpload.single('file'),
    handleMulterError,
    controller.previewImport
  );
  router.post(
    '/import/commit',
    requireActiveOrganizationContext,
    documentUpload.single('file'),
    handleMulterError,
    controller.commitImport
  );

  router.get('/:id', validateParams(z.object({ id: uuidSchema })), controller.getVolunteerById);
  router.get(
    '/:id/assignments',
    validateParams(z.object({ id: uuidSchema })),
    controller.getVolunteerAssignments
  );
  router.post('/', validateBody(createVolunteerSchema), controller.createVolunteer);
  router.put(
    '/:id',
    validateParams(z.object({ id: uuidSchema })),
    validateBody(updateVolunteerSchema),
    controller.updateVolunteer
  );
  router.delete('/:id', validateParams(z.object({ id: uuidSchema })), controller.deleteVolunteer);
  router.post('/assignments', validateBody(volunteerAssignmentSchema), controller.createAssignment);
  router.put(
    '/assignments/:id',
    validateParams(z.object({ id: uuidSchema })),
    validateBody(updateVolunteerAssignmentSchema),
    controller.updateAssignment
  );

  return router;
};

export const volunteersV2Routes = createVolunteersRoutes();
