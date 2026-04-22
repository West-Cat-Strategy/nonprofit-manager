import { uploadFile } from '@services/fileStorageService';
import type { CaseFormAsset, CaseFormAssignment, SaveCaseFormDraftDTO, SubmitCaseFormDTO } from '@app-types/caseForms';
import type { CaseFormsRepository, CaseFormAssignmentRecord } from '../repositories/caseFormsRepository';
import {
  buildAssignmentDetail,
  getPortalAssignment,
} from './caseForms.usecase.access';
import {
  AssignmentDetailResult,
  DownloadableFile,
  ScopedPortalActor,
  TERMINAL_ASSIGNMENT_STATUSES,
  resolveDraftStatus,
} from './caseForms.usecase.shared';
import { completeSubmission } from './caseForms.usecase.submission';

const isTerminalAssignmentStatus = (status: CaseFormAssignmentRecord['status']): boolean =>
  TERMINAL_ASSIGNMENT_STATUSES.has(status);

const getPortalResponsePacketDownloadUrl = (assignmentId: string): string =>
  `/api/v2/portal/forms/assignments/${assignmentId}/response-packet`;

export const listCaseFormAssignmentsForPortal = async (
  repository: CaseFormsRepository,
  contactId: string,
  status?: string
): Promise<CaseFormAssignment[]> => repository.listAssignmentsForPortal(contactId, status);

export const getCaseFormAssignmentDetailForPortal = async (
  repository: CaseFormsRepository,
  input: ScopedPortalActor,
  assignmentId: string
): Promise<AssignmentDetailResult> => {
  const assignment = await getPortalAssignment(repository, input, assignmentId);
  await repository.withTransaction(async (client) => {
    await repository.markAssignmentViewed(client, assignment.id);
  });
  const refreshed = await getPortalAssignment(repository, input, assignmentId);
  return buildAssignmentDetail(repository, refreshed, {
    responsePacketDownloadUrl: getPortalResponsePacketDownloadUrl(refreshed.id),
  });
};

export const uploadCaseFormAssetForPortal = async (
  repository: CaseFormsRepository,
  input: ScopedPortalActor,
  assignmentId: string,
  payload: { question_key: string; asset_kind: 'upload' | 'signature' },
  file: Express.Multer.File
): Promise<CaseFormAsset> => {
  const assignment = await getPortalAssignment(repository, input, assignmentId);
  if (isTerminalAssignmentStatus(assignment.status)) {
    throw Object.assign(new Error('This form assignment can no longer accept uploads'), {
      statusCode: 409,
      code: 'assignment_closed',
    });
  }

  const upload = await uploadFile(file, `case-form-assets/${assignment.case_id}`);
  return repository.withTransaction(async (client) => {
    await repository.markAssignmentViewed(client, assignment.id);
    return repository.createAsset(client, {
      assignmentId: assignment.id,
      caseId: assignment.case_id,
      contactId: assignment.contact_id,
      questionKey: payload.question_key,
      assetKind: payload.asset_kind,
      fileName: upload.fileName,
      originalName: file.originalname,
      filePath: upload.filePath,
      fileSize: upload.fileSize,
      mimeType: file.mimetype,
      actorType: 'portal',
      portalUserId: input.portalUserId || null,
    });
  });
};

export const saveCaseFormDraftForPortal = async (
  repository: CaseFormsRepository,
  input: ScopedPortalActor,
  assignmentId: string,
  payload: SaveCaseFormDraftDTO
): Promise<CaseFormAssignment> => {
  const assignment = await getPortalAssignment(repository, input, assignmentId);
  if (isTerminalAssignmentStatus(assignment.status)) {
    throw Object.assign(new Error('This form assignment can no longer be edited'), {
      statusCode: 409,
      code: 'assignment_closed',
    });
  }

  return repository.withTransaction(async (client) => {
    await repository.markAssignmentViewed(client, assignment.id);
    return repository.saveDraft(client, assignment.id, payload.answers, {
      status: resolveDraftStatus(assignment.status, 'portal'),
      userId: input.portalUserId || null,
    });
  });
};

export const submitCaseFormForPortal = async (
  repository: CaseFormsRepository,
  input: ScopedPortalActor,
  assignmentId: string,
  payload: SubmitCaseFormDTO
): Promise<AssignmentDetailResult> => {
  const assignment = await getPortalAssignment(repository, input, assignmentId);
  return completeSubmission(
    repository,
    assignment,
    { actorType: 'portal', portalUserId: input.portalUserId || null },
    payload,
    {
      responsePacketDownloadUrl: getPortalResponsePacketDownloadUrl(assignment.id),
    }
  );
};

export const getCaseFormResponsePacketForPortal = async (
  repository: CaseFormsRepository,
  input: ScopedPortalActor,
  assignmentId: string
): Promise<DownloadableFile> => {
  const assignment = await getPortalAssignment(repository, input, assignmentId);
  const detail = await buildAssignmentDetail(repository, assignment, {
    responsePacketDownloadUrl: getPortalResponsePacketDownloadUrl(assignment.id),
  });
  const latest = detail.assignment.latest_submission;
  if (!latest?.response_packet_file_path || !latest.response_packet_file_name) {
    throw Object.assign(new Error('Response packet not found'), { statusCode: 404, code: 'not_found' });
  }
  return {
    fileName: latest.response_packet_file_name,
    filePath: latest.response_packet_file_path,
    mimeType: 'application/pdf',
  };
};

export const createPortalCaseFormsFacade = (repository: CaseFormsRepository) => ({
  listAssignmentsForPortal: (contactId: string, status?: string): Promise<CaseFormAssignment[]> =>
    listCaseFormAssignmentsForPortal(repository, contactId, status),
  getAssignmentDetailForPortal: (
    input: ScopedPortalActor,
    assignmentId: string
  ): Promise<AssignmentDetailResult> =>
    getCaseFormAssignmentDetailForPortal(repository, input, assignmentId),
  uploadAssetForPortal: (
    input: ScopedPortalActor,
    assignmentId: string,
    payload: { question_key: string; asset_kind: 'upload' | 'signature' },
    file: Express.Multer.File
  ): Promise<CaseFormAsset> =>
    uploadCaseFormAssetForPortal(repository, input, assignmentId, payload, file),
  saveDraftForPortal: (
    input: ScopedPortalActor,
    assignmentId: string,
    payload: SaveCaseFormDraftDTO
  ): Promise<CaseFormAssignment> =>
    saveCaseFormDraftForPortal(repository, input, assignmentId, payload),
  submitForPortal: (
    input: ScopedPortalActor,
    assignmentId: string,
    payload: SubmitCaseFormDTO
  ): Promise<AssignmentDetailResult> =>
    submitCaseFormForPortal(repository, input, assignmentId, payload),
  getResponsePacketForPortal: (
    input: ScopedPortalActor,
    assignmentId: string
  ): Promise<DownloadableFile> =>
    getCaseFormResponsePacketForPortal(repository, input, assignmentId),
});

export type PortalCaseFormsFacade = ReturnType<typeof createPortalCaseFormsFacade>;
