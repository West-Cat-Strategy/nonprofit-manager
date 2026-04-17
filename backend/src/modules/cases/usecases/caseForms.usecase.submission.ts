import { uploadFile } from '@services/fileStorageService';
import type { PoolClient } from 'pg';
import { generateCaseFormResponsePacket } from '../services/caseFormPacketService';
import type {
  CaseFormAssignmentRecord,
  CaseFormsRepository,
} from '../repositories/caseFormsRepository';
import type { SubmitCaseFormDTO } from '@app-types/caseForms';
import { buildAssignmentDetail, createLifecycleNote } from './caseForms.usecase.access';
import {
  AssignmentDetailResult,
  applyMappings,
  buildReviewFollowUpDescription,
  buildReviewFollowUpTitle,
  buildSubmissionArtifacts,
  includesEmailDelivery,
  includesPortalDelivery,
  noteContent,
  resolveNextBusinessDate,
  resolveSelectedAssets,
  stableSerialize,
  TERMINAL_ASSIGNMENT_STATUSES,
  validateAnswers,
} from './caseForms.usecase.shared';

const syncReviewFollowUpForSubmission = async (
  repository: CaseFormsRepository,
  assignment: CaseFormAssignmentRecord,
  actor: {
    actorType: 'staff' | 'portal' | 'public';
    userId?: string | null;
  },
  submissionNumber: number,
  client: PoolClient
): Promise<void> => {
  if (actor.actorType === 'staff' || !assignment.account_id) {
    return;
  }

  if (actor.actorType === 'portal' && !includesPortalDelivery(assignment.delivery_target)) {
    throw Object.assign(new Error('This form assignment is not available in the portal'), {
      statusCode: 409,
      code: 'assignment_not_delivered',
    });
  }

  if (actor.actorType === 'public' && !includesEmailDelivery(assignment.delivery_target)) {
    throw Object.assign(new Error('This secure form link is no longer active'), {
      statusCode: 409,
      code: 'assignment_not_delivered',
    });
  }

  const actingUserId = actor.userId || assignment.updated_by || assignment.created_by || null;
  const assignedTo = assignment.case_assigned_to || actingUserId || null;
  const title = buildReviewFollowUpTitle(assignment.title);
  const description = buildReviewFollowUpDescription(assignment.title, submissionNumber);
  const scheduledDate = resolveNextBusinessDate();

  if (assignment.review_follow_up_id) {
    const existing = await repository.getReviewFollowUp(
      client,
      assignment.account_id,
      assignment.review_follow_up_id
    );

    if (existing?.status === 'scheduled') {
      await repository.updateScheduledReviewFollowUp(client, {
        organizationId: assignment.account_id,
        followUpId: existing.id,
        title,
        description,
        scheduledDate,
        assignedTo,
        userId: actingUserId,
      });
      return;
    }
  }

  const reviewFollowUpId = await repository.createReviewFollowUp(client, {
    organizationId: assignment.account_id,
    caseId: assignment.case_id,
    title,
    description,
    scheduledDate,
    assignedTo,
    userId: actingUserId,
  });

  await repository.updateAssignment(client, assignment.id, {
    reviewFollowUpId,
    userId: actingUserId,
  });
};

export const completeSubmission = async (
  repository: CaseFormsRepository,
  assignment: CaseFormAssignmentRecord,
  actor: {
    actorType: 'staff' | 'portal' | 'public';
    userId?: string | null;
    portalUserId?: string | null;
    accessTokenId?: string | null;
  },
  payload: SubmitCaseFormDTO
): Promise<AssignmentDetailResult> => {
  if (TERMINAL_ASSIGNMENT_STATUSES.has(assignment.status) && assignment.status !== 'submitted') {
    throw Object.assign(new Error('This form assignment can no longer accept submissions'), {
      statusCode: 409,
      code: 'assignment_closed',
    });
  }

  if (actor.actorType !== 'staff' && assignment.status === 'draft') {
    throw Object.assign(new Error('This form assignment has not been delivered to the client yet'), {
      statusCode: 409,
      code: 'assignment_not_delivered',
    });
  }

  const replayId = payload.client_submission_id?.trim() || null;
  if (replayId) {
    const existing = await repository.getSubmissionByClientSubmissionId(assignment.id, replayId);
    if (existing) {
      if (stableSerialize(existing.answers) !== stableSerialize(payload.answers)) {
        throw Object.assign(new Error('client_submission_id was already used with a different payload'), {
          statusCode: 409,
          code: 'idempotency_conflict',
        });
      }
      return buildAssignmentDetail(repository, assignment);
    }
  }

  const assignmentAssets = await repository.listAssetsForAssignment(assignment.id);
  const { normalizedAnswers, visibleQuestions } = validateAnswers(assignment.schema, payload.answers);
  const selectedAssets = resolveSelectedAssets(
    visibleQuestions,
    normalizedAnswers,
    assignmentAssets,
    assignment.id
  );
  const anticipatedSubmissionNumber =
    (await repository.listSubmissionsForAssignment(assignment.id)).length + 1;

  const artifactDraft = await buildSubmissionArtifacts({
    assignment,
    answers: normalizedAnswers,
    visibleQuestions,
    assets: selectedAssets,
    submissionNumber: anticipatedSubmissionNumber,
    actorType: actor.actorType,
    generatePacket: generateCaseFormResponsePacket,
    uploadGeneratedFile: uploadFile,
  });

  await repository.withTransaction(async (client) => {
    const { contactPatch, caseJsonUpdates, audit } = applyMappings(visibleQuestions, normalizedAnswers);

    if (Object.keys(contactPatch).length > 0) {
      await repository.updateContactFields(client, assignment.contact_id, contactPatch);
    }

    for (const update of caseJsonUpdates) {
      await repository.updateCaseJsonField(client, assignment.case_id, update.container, update.key, update.value);
    }

    const responsePacketCaseDocumentId = await repository.createCaseDocumentRecord(client, {
      caseId: assignment.case_id,
      accountId: assignment.account_id || null,
      documentName: `${assignment.title} Response Packet`,
      documentType: 'form_response',
      description: 'Auto-generated case form response packet',
      filePath: artifactDraft.packetUpload.filePath,
      fileSize: artifactDraft.packetUpload.fileSize,
      mimeType: 'application/pdf',
      fileName: artifactDraft.packetUpload.fileName,
      originalFilename: artifactDraft.packetOriginalFileName,
      visibleToClient: assignment.client_viewable === true,
      userId: actor.userId || null,
    });

    const responsePacketContactDocumentId = await repository.createContactDocumentRecord(client, {
      contactId: assignment.contact_id,
      caseId: assignment.case_id,
      documentType: 'form_response',
      title: `${assignment.title} Response Packet`,
      description: 'Auto-generated case form response packet',
      fileName: artifactDraft.packetUpload.fileName,
      originalName: artifactDraft.packetOriginalFileName,
      filePath: artifactDraft.packetUpload.filePath,
      fileSize: artifactDraft.packetUpload.fileSize,
      mimeType: 'application/pdf',
      portalVisible: assignment.client_viewable === true,
      userId: actor.userId || null,
    });

    const nextSubmissionNumber = await repository.getNextSubmissionNumber(client, assignment.id);
    const submission = await repository.createSubmission(client, {
      assignmentId: assignment.id,
      caseId: assignment.case_id,
      contactId: assignment.contact_id,
      submissionNumber: nextSubmissionNumber,
      answers: normalizedAnswers,
      mappingAudit: audit,
      clientSubmissionId: replayId,
      actorType: actor.actorType,
      submittedByUserId: actor.userId || null,
      submittedByPortalUserId: actor.portalUserId || null,
      accessTokenId: actor.accessTokenId || null,
      responsePacketFileName: artifactDraft.packetOriginalFileName,
      responsePacketFilePath: artifactDraft.packetUpload.filePath,
      responsePacketCaseDocumentId,
      responsePacketContactDocumentId,
    });

    await repository.linkAssetsToSubmission(
      client,
      selectedAssets.map((asset) => asset.id),
      submission.id
    );

    for (const asset of selectedAssets) {
      const visibleQuestion = visibleQuestions.find((item) => item.question.key === asset.question_key);
      const label = visibleQuestion?.question.label || asset.question_key;

      await repository.createCaseDocumentRecord(client, {
        caseId: assignment.case_id,
        accountId: assignment.account_id || null,
        documentName: `${assignment.title} Attachment — ${label}`,
        documentType: 'form_attachment',
        description: `Submitted ${asset.asset_kind} for question "${label}"`,
        filePath: asset.file_path,
        fileSize: asset.file_size,
        mimeType: asset.mime_type,
        fileName: asset.file_name,
        originalFilename: asset.original_name,
        visibleToClient: assignment.client_viewable === true,
        userId: actor.userId || null,
      });

      await repository.createContactDocumentRecord(client, {
        contactId: assignment.contact_id,
        caseId: assignment.case_id,
        documentType: 'form_attachment',
        title: `${assignment.title} Attachment — ${label}`,
        description: `Submitted ${asset.asset_kind} for question "${label}"`,
        fileName: asset.file_name,
        originalName: asset.original_name,
        filePath: asset.file_path,
        fileSize: asset.file_size,
        mimeType: asset.mime_type,
        portalVisible: assignment.client_viewable === true,
        userId: actor.userId || null,
      });
    }

    await repository.markAssignmentAfterSubmission(client, assignment.id, normalizedAnswers, actor.userId || null);
    await createLifecycleNote(
      client,
      assignment.case_id,
      noteContent('submitted', assignment.title, `Submission #${nextSubmissionNumber} recorded.`),
      actor.userId || null
    );

    await syncReviewFollowUpForSubmission(repository, assignment, actor, nextSubmissionNumber, client);

    if (actor.accessTokenId) {
      await repository.markAccessTokenUsed(client, actor.accessTokenId, submission.id);
    }
  });

  const refreshed = await repository.getAssignmentById(assignment.id);
  if (!refreshed) {
    throw Object.assign(new Error('Form assignment not found after submission'), {
      statusCode: 404,
      code: 'not_found',
    });
  }
  return buildAssignmentDetail(repository, refreshed);
};
