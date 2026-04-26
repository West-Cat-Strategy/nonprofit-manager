import type { Router } from 'express';
import { requirePermission } from '@middleware/permissions';
import { validateBody, validateParams } from '@middleware/zodValidation';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  listPortalEscalationsForCase,
  updatePortalEscalationForCase,
} from '@services/portalEscalationService';
import {
  casePortalConversationParamsSchema,
  portalCaseEscalationUpdateSchema,
  portalEscalationParamsSchema,
} from '@validations/portal';
import { Permission } from '@utils/permissions';

export const registerCasePortalEscalationRoutes = (router: Router): void => {
  router.get(
    '/:id/portal/escalations',
    validateParams(casePortalConversationParamsSchema),
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const escalations = await listPortalEscalationsForCase(
          req.params.id,
          req.organizationId ?? null
        );
        sendSuccess(res, escalations);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    '/:id/portal/escalations/:escalationId',
    validateParams(portalEscalationParamsSchema),
    validateBody(portalCaseEscalationUpdateSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const body = req.body as {
          status?: Parameters<typeof updatePortalEscalationForCase>[0]['status'];
          resolution_summary?: string | null;
          assignee_user_id?: string | null;
          sla_due_at?: string | null;
        };
        const updateInput: Parameters<typeof updatePortalEscalationForCase>[0] = {
          id: req.params.escalationId,
          caseId: req.params.id,
          accountId: req.organizationId ?? null,
          updatedBy: req.user?.id ?? null,
        };

        if ('status' in body) {
          updateInput.status = body.status;
        }
        if ('resolution_summary' in body) {
          updateInput.resolutionSummary = body.resolution_summary ?? null;
        }
        if ('assignee_user_id' in body) {
          updateInput.assigneeUserId = body.assignee_user_id ?? null;
        }
        if ('sla_due_at' in body) {
          updateInput.slaDueAt = body.sla_due_at ? new Date(body.sla_due_at) : null;
        }

        const escalation = await updatePortalEscalationForCase(updateInput);
        sendSuccess(res, escalation);
      } catch (error) {
        next(error);
      }
    }
  );
};
