import type { PoolClient } from 'pg';
import type { CaseFormReviewDecision } from '@app-types/caseForms';
import type {
  CaseFormAssignmentRecord,
  CaseFormsRepository,
} from '../repositories/caseFormsRepository';
import {
  buildPendingMappingApplication,
  buildReviewFollowUpResolutionNote,
} from './caseForms.usecase.shared';

export const applyReviewFollowUpDecision = async (
  repository: CaseFormsRepository,
  client: PoolClient,
  assignment: CaseFormAssignmentRecord,
  payload: CaseFormReviewDecision,
  userId?: string | null
): Promise<void> => {
  if (!assignment.review_follow_up_id || !assignment.account_id) {
    return;
  }

  const notes = buildReviewFollowUpResolutionNote(
    payload.decision,
    assignment.title,
    payload.notes
  );

  if (payload.decision === 'revision_requested') {
    return;
  }

  if (payload.decision === 'cancelled') {
    await repository.cancelReviewFollowUp(client, {
      organizationId: assignment.account_id,
      followUpId: assignment.review_follow_up_id,
      notes,
      userId: userId || null,
    });
    return;
  }

  await repository.completeReviewFollowUp(client, {
    organizationId: assignment.account_id,
    followUpId: assignment.review_follow_up_id,
    notes,
    userId: userId || null,
  });
};

export const applyLatestPendingSubmissionMappings = async (
  repository: CaseFormsRepository,
  client: PoolClient,
  assignment: CaseFormAssignmentRecord,
  userId?: string | null
): Promise<{ submissionId: string | null; appliedCount: number }> => {
  const latestSubmission = await repository.getLatestSubmissionForAssignment(
    client,
    assignment.id,
    {
      forUpdate: true,
    }
  );
  if (!latestSubmission) {
    return { submissionId: null, appliedCount: 0 };
  }

  const application = buildPendingMappingApplication(
    latestSubmission.mapping_audit,
    userId || null
  );
  if (application.appliedCount === 0) {
    return { submissionId: latestSubmission.id, appliedCount: 0 };
  }

  if (Object.keys(application.contactPatch).length > 0) {
    await repository.updateContactFields(client, assignment.contact_id, application.contactPatch);
  }

  for (const update of application.caseJsonUpdates) {
    await repository.updateCaseJsonField(
      client,
      assignment.case_id,
      update.container,
      update.key,
      update.value
    );
  }

  await repository.updateSubmissionMappingAudit(client, latestSubmission.id, application.audit);

  return { submissionId: latestSubmission.id, appliedCount: application.appliedCount };
};
