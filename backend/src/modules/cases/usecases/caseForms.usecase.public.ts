import { uploadFile } from '@services/fileStorageService';
import type { CaseFormAsset, CaseFormAssignment, SaveCaseFormDraftDTO, SubmitCaseFormDTO } from '@app-types/caseForms';
import type { CaseFormsRepository } from '../repositories/caseFormsRepository';
import {
  buildAssignmentDetail,
  getPublicAccess,
} from './caseForms.usecase.access';
import {
  AssignmentDetailResult,
  TERMINAL_ASSIGNMENT_STATUSES,
  resolveDraftStatus,
  DownloadableFile,
} from './caseForms.usecase.shared';
import { completeSubmission } from './caseForms.usecase.submission';

const isTerminalAssignmentStatus = (status: CaseFormAssignment['status']): boolean =>
  TERMINAL_ASSIGNMENT_STATUSES.has(status);

export const getCaseFormAssignmentDetailByToken = async (
  repository: CaseFormsRepository,
  rawToken: string
): Promise<AssignmentDetailResult> => {
  const access = await getPublicAccess(repository, rawToken);
  await repository.withTransaction(async (client) => {
    await repository.markAssignmentViewed(client, access.token.assignment.id);
    await repository.markAccessTokenViewed(client, access.token.id);
  });
  return buildAssignmentDetail(repository, {
    ...access.token.assignment,
    viewed_at: access.token.assignment.viewed_at || new Date(),
  }, {
    responsePacketDownloadUrl: `/api/v2/public/case-forms/${rawToken}/response-packet`,
    buildAssetDownloadUrl: null,
  });
};

export const uploadCaseFormAssetByToken = async (
  repository: CaseFormsRepository,
  rawToken: string,
  payload: { question_key: string; asset_kind: 'upload' | 'signature' },
  file: Express.Multer.File
): Promise<CaseFormAsset> => {
  const access = await getPublicAccess(repository, rawToken);
  const assignment = access.token.assignment;
  if (isTerminalAssignmentStatus(assignment.status)) {
    throw Object.assign(new Error('This form assignment can no longer accept uploads'), {
      statusCode: 409,
      code: 'assignment_closed',
    });
  }

  const upload = await uploadFile(file, `case-form-assets/${assignment.case_id}`);
  return repository.withTransaction(async (client) => {
    await repository.markAssignmentViewed(client, assignment.id);
    await repository.markAccessTokenViewed(client, access.token.id);
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
      actorType: 'public',
    });
  });
};

export const saveCaseFormDraftByToken = async (
  repository: CaseFormsRepository,
  rawToken: string,
  payload: SaveCaseFormDraftDTO
): Promise<CaseFormAssignment> => {
  const access = await getPublicAccess(repository, rawToken);
  const assignment = access.token.assignment;
  if (isTerminalAssignmentStatus(assignment.status)) {
    throw Object.assign(new Error('This form assignment can no longer be edited'), {
      statusCode: 409,
      code: 'assignment_closed',
    });
  }

  return repository.withTransaction(async (client) => {
    await repository.markAssignmentViewed(client, assignment.id);
    await repository.markAccessTokenViewed(client, access.token.id);
    return repository.saveDraft(client, assignment.id, payload.answers, {
      status: resolveDraftStatus(assignment.status, 'public'),
    });
  });
};

export const submitCaseFormByToken = async (
  repository: CaseFormsRepository,
  rawToken: string,
  payload: SubmitCaseFormDTO
): Promise<AssignmentDetailResult> => {
  const access = await getPublicAccess(repository, rawToken);
  return completeSubmission(
    repository,
    access.token.assignment,
    { actorType: 'public', accessTokenId: access.token.id },
    payload
  );
};

export const getCaseFormResponsePacketByToken = async (
  repository: CaseFormsRepository,
  rawToken: string
): Promise<DownloadableFile> => {
  const access = await getPublicAccess(repository, rawToken);
  const detail = await buildAssignmentDetail(repository, access.token.assignment);
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

export const createPublicCaseFormsFacade = (repository: CaseFormsRepository) => ({
  getAssignmentDetailByToken: (rawToken: string): Promise<AssignmentDetailResult> =>
    getCaseFormAssignmentDetailByToken(repository, rawToken),
  uploadAssetByToken: (
    rawToken: string,
    payload: { question_key: string; asset_kind: 'upload' | 'signature' },
    file: Express.Multer.File
  ): Promise<CaseFormAsset> =>
    uploadCaseFormAssetByToken(repository, rawToken, payload, file),
  saveDraftByToken: (rawToken: string, payload: SaveCaseFormDraftDTO): Promise<CaseFormAssignment> =>
    saveCaseFormDraftByToken(repository, rawToken, payload),
  submitByToken: (rawToken: string, payload: SubmitCaseFormDTO): Promise<AssignmentDetailResult> =>
    submitCaseFormByToken(repository, rawToken, payload),
  getResponsePacketByToken: (rawToken: string): Promise<DownloadableFile> =>
    getCaseFormResponsePacketByToken(repository, rawToken),
});

export type PublicCaseFormsFacade = ReturnType<typeof createPublicCaseFormsFacade>;
