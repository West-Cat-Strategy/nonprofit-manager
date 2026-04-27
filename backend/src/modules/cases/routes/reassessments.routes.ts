import type { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@middleware/permissions';
import { validateBody, validateParams } from '@middleware/zodValidation';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  isoDateSchema,
  optionalStrictBooleanSchema,
  uuidSchema,
} from '@validations/shared';
import { Permission } from '@utils/permissions';
import { CaseReassessmentsRepository } from '../repositories/caseReassessmentsRepository';

const caseIdParamsSchema = z.object({
  id: uuidSchema,
});

const caseReassessmentParamsSchema = z.object({
  id: uuidSchema,
  reassessmentId: uuidSchema,
});

const caseReassessmentStatusUpdateSchema = z.enum(['scheduled', 'in_progress']);

const createCaseReassessmentSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().nullable().optional(),
    earliest_review_date: isoDateSchema.nullable().optional(),
    due_date: isoDateSchema,
    latest_review_date: isoDateSchema.nullable().optional(),
    owner_user_id: uuidSchema.nullable().optional(),
  })
  .strict();

const updateCaseReassessmentSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    summary: z.string().trim().nullable().optional(),
    earliest_review_date: isoDateSchema.nullable().optional(),
    due_date: isoDateSchema.optional(),
    latest_review_date: isoDateSchema.nullable().optional(),
    owner_user_id: uuidSchema.nullable().optional(),
    status: caseReassessmentStatusUpdateSchema.optional(),
  })
  .strict();

const completeCaseReassessmentSchema = z
  .object({
    completion_summary: z.string().trim().min(1),
    outcome_definition_ids: z.array(uuidSchema).optional(),
    outcome_visibility: optionalStrictBooleanSchema,
    next_due_date: isoDateSchema.optional(),
    next_title: z.string().trim().min(1).optional(),
    next_summary: z.string().trim().nullable().optional(),
    next_earliest_review_date: isoDateSchema.nullable().optional(),
    next_latest_review_date: isoDateSchema.nullable().optional(),
    next_owner_user_id: uuidSchema.nullable().optional(),
  })
  .strict();

const cancelCaseReassessmentSchema = z
  .object({
    cancellation_reason: z.string().trim().min(1),
  })
  .strict();

export const registerCaseReassessmentRoutes = (router: Router): void => {
  const reassessmentsRepository = new CaseReassessmentsRepository();

  router.get(
    '/:id/reassessments',
    validateParams(caseIdParamsSchema),
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const reassessments = await reassessmentsRepository.list(
          req.params.id,
          req.organizationId ?? ''
        );
        sendSuccess(res, reassessments);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/reassessments',
    validateParams(caseIdParamsSchema),
    validateBody(createCaseReassessmentSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const reassessment = await reassessmentsRepository.create(
          req.params.id,
          req.organizationId ?? '',
          req.user?.id ?? '',
          req.validatedBody ?? req.body
        );
        sendSuccess(res, reassessment, 201);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    '/:id/reassessments/:reassessmentId',
    validateParams(caseReassessmentParamsSchema),
    validateBody(updateCaseReassessmentSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const reassessment = await reassessmentsRepository.update(
          req.params.id,
          req.params.reassessmentId,
          req.organizationId ?? '',
          req.user?.id ?? '',
          req.validatedBody ?? req.body
        );
        sendSuccess(res, reassessment);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/reassessments/:reassessmentId/complete',
    validateParams(caseReassessmentParamsSchema),
    validateBody(completeCaseReassessmentSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const result = await reassessmentsRepository.complete(
          req.params.id,
          req.params.reassessmentId,
          req.organizationId ?? '',
          req.user?.id ?? '',
          req.validatedBody ?? req.body
        );
        sendSuccess(res, result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/reassessments/:reassessmentId/cancel',
    validateParams(caseReassessmentParamsSchema),
    validateBody(cancelCaseReassessmentSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const reassessment = await reassessmentsRepository.cancel(
          req.params.id,
          req.params.reassessmentId,
          req.organizationId ?? '',
          req.user?.id ?? '',
          (req.validatedBody ?? req.body).cancellation_reason
        );
        sendSuccess(res, reassessment);
      } catch (error) {
        next(error);
      }
    }
  );
};
