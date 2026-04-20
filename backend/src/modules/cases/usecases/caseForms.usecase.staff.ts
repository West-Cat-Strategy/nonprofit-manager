import crypto from 'crypto';
import type { Pool, PoolClient } from 'pg';
import { sendMail } from '@services/emailService';
import { uploadFile } from '@services/fileStorageService';
import { hashData } from '@utils/encryption';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormDefault,
  CaseFormReviewDecision,
  CreateCaseFormAssignmentDTO,
  CreateCaseFormDefaultDTO,
  SaveCaseFormDraftDTO,
  SendCaseFormAssignmentDTO,
  SubmitCaseFormDTO,
  UpdateCaseFormAssignmentDTO,
  UpdateCaseFormDefaultDTO,
} from '@app-types/caseForms';
import type {
  CaseFormsRepository,
  CaseFormAssignmentRecord,
} from '../repositories/caseFormsRepository';
import { requireCaseOwnership } from '../queries/shared';
import {
  buildAssignmentDetail,
  createLifecycleNote,
  getCaseAssignment,
} from './caseForms.usecase.access';
import { completeSubmission } from './caseForms.usecase.submission';
import {
  AssignmentDetailResult,
  buildAccessLinkUrl,
  buildReviewFollowUpResolutionNote,
  DownloadableFile,
  formatDeliveryTargetLabel,
  includesEmailDelivery,
  noteContent,
  resolveDraftStatus,
  resolveExpiryDate,
} from './caseForms.usecase.shared';

type Db = Pool | PoolClient;

const applyReviewFollowUpDecision = async (
  repository: CaseFormsRepository,
  client: PoolClient,
  assignment: CaseFormAssignmentRecord,
  payload: CaseFormReviewDecision,
  userId?: string | null
): Promise<void> => {
  if (!assignment.review_follow_up_id || !assignment.account_id) {
    return;
  }

  const notes = buildReviewFollowUpResolutionNote(payload.decision, assignment.title, payload.notes);

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

export const listCaseFormDefaults = async (
  repository: CaseFormsRepository,
  caseTypeId: string,
  organizationId?: string
): Promise<CaseFormDefault[]> => repository.listDefaultsByCaseType(caseTypeId, organizationId);

export const createCaseFormDefault = async (
  repository: CaseFormsRepository,
  caseTypeId: string,
  payload: CreateCaseFormDefaultDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseFormDefault> =>
  repository.withTransaction((client) =>
    repository.createDefault(client, {
      caseTypeId,
      organizationId: organizationId || null,
      title: payload.title,
      description: payload.description || null,
      schema: payload.schema,
      isActive: payload.is_active !== false,
      userId: userId || null,
    })
  );

export const updateCaseFormDefault = async (
  repository: CaseFormsRepository,
  caseTypeId: string,
  defaultId: string,
  payload: UpdateCaseFormDefaultDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseFormDefault> => {
  const current = await repository.getDefaultById(defaultId, organizationId);
  if (!current || current.case_type_id !== caseTypeId) {
    throw Object.assign(new Error('Form default not found'), { statusCode: 404, code: 'not_found' });
  }

  return repository.withTransaction((client) =>
    repository.updateDefault(client, defaultId, {
      title: payload.title,
      description: payload.description,
      schema: payload.schema,
      isActive: payload.is_active,
      userId: userId || null,
    })
  );
};

export const listCaseFormRecommendedDefaults = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  organizationId?: string
): Promise<CaseFormDefault[]> => {
  await requireCaseOwnership(db, caseId, organizationId);
  return repository.listRecommendedDefaultsForCase(caseId, organizationId);
};

export const listCaseFormAssignmentsForCase = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  organizationId?: string
): Promise<CaseFormAssignment[]> => {
  await requireCaseOwnership(db, caseId, organizationId);
  return repository.listAssignmentsForCase(caseId, organizationId);
};

export const createCaseFormAssignment = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  payload: CreateCaseFormAssignmentDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseFormAssignment> => {
  const ownership = await requireCaseOwnership(db, caseId, organizationId);
  const sourceDefaultId = payload.source_default_id || null;
  let sourceDefaultVersion: number | null = null;

  if (sourceDefaultId) {
    const formDefault = await repository.getDefaultById(sourceDefaultId, organizationId);
    if (!formDefault) {
      throw Object.assign(new Error('Form default not found'), {
        statusCode: 404,
        code: 'not_found',
      });
    }
    sourceDefaultVersion = formDefault.version;
  }

  return repository.withTransaction((client) =>
    repository.createAssignment(client, {
      caseId,
      contactId: ownership.contact_id,
      accountId: ownership.account_id,
      caseTypeId: payload.case_type_id || null,
      sourceDefaultId,
      sourceDefaultVersion,
      title: payload.title,
      description: payload.description || null,
      schema: payload.schema,
      dueAt: payload.due_at || null,
      recipientEmail: payload.recipient_email || null,
      userId: userId || null,
    })
  );
};

export const instantiateCaseFormDefault = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  defaultId: string,
  userId?: string,
  organizationId?: string
): Promise<CaseFormAssignment> => {
  const ownership = await requireCaseOwnership(db, caseId, organizationId);
  const formDefault = await repository.getDefaultById(defaultId, organizationId);
  if (!formDefault) {
    throw Object.assign(new Error('Form default not found'), { statusCode: 404, code: 'not_found' });
  }

  return repository.withTransaction((client) =>
    repository.createAssignment(client, {
      caseId,
      contactId: ownership.contact_id,
      accountId: ownership.account_id,
      caseTypeId: formDefault.case_type_id,
      sourceDefaultId: formDefault.id,
      sourceDefaultVersion: formDefault.version,
      title: formDefault.title,
      description: formDefault.description || null,
      schema: formDefault.schema,
      userId: userId || null,
    })
  );
};

export const getCaseFormAssignmentDetailForCase = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  organizationId?: string
): Promise<AssignmentDetailResult> => {
  const assignment = await getCaseAssignment(repository, db, caseId, assignmentId, organizationId);
  return buildAssignmentDetail(repository, assignment, {
    responsePacketDownloadUrl: `/api/v2/cases/${assignment.case_id}/forms/${assignment.id}/response-packet`,
    buildAssetDownloadUrl: (assetId) =>
      `/api/v2/cases/${assignment.case_id}/forms/${assignment.id}/assets/${assetId}/download`,
  });
};

export const updateCaseFormAssignmentForCase = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  payload: UpdateCaseFormAssignmentDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseFormAssignment> => {
  await getCaseAssignment(repository, db, caseId, assignmentId, organizationId);
  return repository.withTransaction((client) =>
    repository.updateAssignment(client, assignmentId, {
      title: payload.title,
      description: payload.description,
      schema: payload.schema,
      dueAt: payload.due_at,
      recipientEmail: payload.recipient_email,
      status: payload.status,
      userId,
    })
  );
};

export const uploadCaseFormAssetForCase = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  payload: { question_key: string; asset_kind: 'upload' | 'signature' },
  file: Express.Multer.File,
  userId?: string,
  organizationId?: string
): Promise<CaseFormAsset> => {
  const assignment = await getCaseAssignment(repository, db, caseId, assignmentId, organizationId);
  if (assignment.status === 'closed' || assignment.status === 'cancelled') {
    throw Object.assign(new Error('This form assignment can no longer accept uploads'), {
      statusCode: 409,
      code: 'assignment_closed',
    });
  }

  const upload = await uploadFile(file, `case-form-assets/${assignment.case_id}`);
  return repository.withTransaction((client) =>
    repository.createAsset(client, {
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
      actorType: 'staff',
      userId: userId || null,
    })
  );
};

export const saveCaseFormDraftForCase = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  payload: SaveCaseFormDraftDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseFormAssignment> => {
  const assignment = await getCaseAssignment(repository, db, caseId, assignmentId, organizationId);
  if (assignment.status === 'closed' || assignment.status === 'cancelled') {
    throw Object.assign(new Error('This form assignment can no longer be edited'), {
      statusCode: 409,
      code: 'assignment_closed',
    });
  }

  return repository.withTransaction((client) =>
    repository.saveDraft(client, assignment.id, payload.answers, {
      status: resolveDraftStatus(assignment.status, 'staff'),
      userId: userId || null,
    })
  );
};

export const submitCaseFormForCase = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  payload: SubmitCaseFormDTO,
  userId?: string,
  organizationId?: string
): Promise<AssignmentDetailResult> => {
  const assignment = await getCaseAssignment(repository, db, caseId, assignmentId, organizationId);
  return completeSubmission(
    repository,
    assignment,
    { actorType: 'staff', userId: userId || null },
    payload
  );
};

export const sendCaseFormAssignment = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  payload: SendCaseFormAssignmentDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseFormAssignment> => {
  const assignment = await getCaseAssignment(repository, db, caseId, assignmentId, organizationId);
  if (assignment.status === 'closed' || assignment.status === 'cancelled') {
    throw Object.assign(new Error('This form assignment can no longer be sent'), {
      statusCode: 409,
      code: 'assignment_closed',
    });
  }

  if (assignment.client_viewable !== true) {
    throw Object.assign(
      new Error('This case must be shared with the client before forms can be delivered'),
      { statusCode: 400, code: 'validation_error' }
    );
  }

  const emailDeliveryEnabled = includesEmailDelivery(payload.delivery_target);
  const recipientEmail = emailDeliveryEnabled
    ? payload.recipient_email?.trim() || assignment.recipient_email?.trim() || null
    : assignment.recipient_email?.trim() || null;

  if (emailDeliveryEnabled && !recipientEmail) {
    throw Object.assign(new Error('Recipient email is required for email delivery'), {
      statusCode: 400,
      code: 'validation_error',
    });
  }

  const rawToken = emailDeliveryEnabled ? crypto.randomBytes(24).toString('base64url') : null;
  const tokenHash = rawToken ? hashData(rawToken) : null;
  const expiresAt = emailDeliveryEnabled ? resolveExpiryDate(assignment, payload.expires_in_days) : null;

  await repository.withTransaction(async (client) => {
    await repository.revokeAccessTokens(client, assignment.id);

    if (emailDeliveryEnabled && recipientEmail && tokenHash && expiresAt) {
      await repository.createAccessToken(client, {
        assignmentId: assignment.id,
        caseId: assignment.case_id,
        contactId: assignment.contact_id,
        recipientEmail,
        tokenHash,
        expiresAt,
        userId,
      });
    }

    await repository.updateAssignment(client, assignment.id, {
      recipientEmail,
      status: 'sent',
      deliveryTarget: payload.delivery_target,
      userId,
    });
    await repository.markAssignmentSent(client, assignment.id);
    await createLifecycleNote(
      client,
      assignment.case_id,
      noteContent(
        'sent',
        assignment.title,
        [
          `Delivered via ${formatDeliveryTargetLabel(payload.delivery_target)}.`,
          emailDeliveryEnabled && recipientEmail ? `Recipient: ${recipientEmail}.` : null,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      userId || null
    );
  });

  if (emailDeliveryEnabled && recipientEmail && rawToken && expiresAt) {
    const accessLink = buildAccessLinkUrl(rawToken);
    await sendMail({
      to: recipientEmail,
      subject: `Please complete your form: ${assignment.title}`,
      text: [
        'A staff member has requested information for your case.',
        '',
        `Form: ${assignment.title}`,
        assignment.description ? `Details: ${assignment.description}` : null,
        '',
        `Complete the form here: ${accessLink}`,
        '',
        `This secure link expires on ${expiresAt.toISOString()}.`,
      ]
        .filter(Boolean)
        .join('\n'),
      html: [
        '<p>A staff member has requested information for your case.</p>',
        `<p><strong>Form:</strong> ${assignment.title}</p>`,
        assignment.description ? `<p><strong>Details:</strong> ${assignment.description}</p>` : null,
        `<p><a href="${accessLink}">Complete the form here</a></p>`,
        `<p>This secure link expires on ${expiresAt.toISOString()}.</p>`,
      ]
        .filter(Boolean)
        .join(''),
    });
  }

  const refreshed = await repository.getAssignmentById(assignment.id);
  if (!refreshed) {
    throw Object.assign(new Error('Form assignment not found after send'), { statusCode: 404, code: 'not_found' });
  }

  return {
    ...refreshed,
    access_link_url: rawToken ? buildAccessLinkUrl(rawToken) : null,
  };
};

export const reviewCaseFormAssignment = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  payload: CaseFormReviewDecision,
  userId?: string,
  organizationId?: string
): Promise<CaseFormAssignment> => {
  const assignment = await getCaseAssignment(repository, db, caseId, assignmentId, organizationId);
  await repository.withTransaction(async (client) => {
    await applyReviewFollowUpDecision(repository, client, assignment, payload, userId || null);
    await repository.markAssignmentReviewDecision(client, assignment.id, {
      status: payload.decision,
      userId: userId || null,
    });
    await createLifecycleNote(
      client,
      assignment.case_id,
      noteContent(
        payload.decision === 'reviewed' ? 'reviewed' : payload.decision,
        assignment.title,
        payload.notes || null
      ),
      userId || null
    );
  });

  const refreshed = await repository.getAssignmentById(assignment.id);
  if (!refreshed) {
    throw Object.assign(new Error('Form assignment not found after review'), { statusCode: 404, code: 'not_found' });
  }

  return refreshed;
};

export const getCaseFormResponsePacketForCase = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  organizationId?: string
): Promise<DownloadableFile> => {
  const detail = await getCaseFormAssignmentDetailForCase(repository, db, caseId, assignmentId, organizationId);
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

export const getCaseFormAssetForCase = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  assetId: string,
  organizationId?: string
): Promise<DownloadableFile> => {
  const assignment = await getCaseAssignment(repository, db, caseId, assignmentId, organizationId);
  const assets = await repository.listAssetsForAssignment(assignment.id);
  const asset = assets.find((candidate) => candidate.id === assetId);
  if (!asset) {
    throw Object.assign(new Error('Form asset not found'), { statusCode: 404, code: 'not_found' });
  }
  return {
    fileName: asset.original_name,
    filePath: asset.file_path,
    mimeType: asset.mime_type,
  };
};

export const createStaffCaseFormsFacade = (
  repository: CaseFormsRepository,
  db: Db
) => ({
  listDefaults: (caseTypeId: string, organizationId?: string): Promise<CaseFormDefault[]> =>
    listCaseFormDefaults(repository, caseTypeId, organizationId),
  createDefault: (
    caseTypeId: string,
    payload: CreateCaseFormDefaultDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormDefault> =>
    createCaseFormDefault(repository, caseTypeId, payload, userId, organizationId),
  updateDefault: (
    caseTypeId: string,
    defaultId: string,
    payload: UpdateCaseFormDefaultDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormDefault> =>
    updateCaseFormDefault(repository, caseTypeId, defaultId, payload, userId, organizationId),
  listRecommendedDefaults: (caseId: string, organizationId?: string): Promise<CaseFormDefault[]> =>
    listCaseFormRecommendedDefaults(repository, db, caseId, organizationId),
  listAssignmentsForCase: (caseId: string, organizationId?: string): Promise<CaseFormAssignment[]> =>
    listCaseFormAssignmentsForCase(repository, db, caseId, organizationId),
  createAssignment: (
    caseId: string,
    payload: CreateCaseFormAssignmentDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> =>
    createCaseFormAssignment(repository, db, caseId, payload, userId, organizationId),
  instantiateDefault: (
    caseId: string,
    defaultId: string,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> =>
    instantiateCaseFormDefault(repository, db, caseId, defaultId, userId, organizationId),
  getAssignmentDetailForCase: (
    caseId: string,
    assignmentId: string,
    organizationId?: string
  ): Promise<AssignmentDetailResult> =>
    getCaseFormAssignmentDetailForCase(repository, db, caseId, assignmentId, organizationId),
  updateAssignmentForCase: (
    caseId: string,
    assignmentId: string,
    payload: UpdateCaseFormAssignmentDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> =>
    updateCaseFormAssignmentForCase(
      repository,
      db,
      caseId,
      assignmentId,
      payload,
      userId,
      organizationId
    ),
  uploadAssetForCase: (
    caseId: string,
    assignmentId: string,
    payload: { question_key: string; asset_kind: 'upload' | 'signature' },
    file: Express.Multer.File,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAsset> =>
    uploadCaseFormAssetForCase(
      repository,
      db,
      caseId,
      assignmentId,
      payload,
      file,
      userId,
      organizationId
    ),
  saveDraftForCase: (
    caseId: string,
    assignmentId: string,
    payload: SaveCaseFormDraftDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> =>
    saveCaseFormDraftForCase(repository, db, caseId, assignmentId, payload, userId, organizationId),
  submitForCase: (
    caseId: string,
    assignmentId: string,
    payload: SubmitCaseFormDTO,
    userId?: string,
    organizationId?: string
  ): Promise<AssignmentDetailResult> =>
    submitCaseFormForCase(repository, db, caseId, assignmentId, payload, userId, organizationId),
  sendAssignment: (
    caseId: string,
    assignmentId: string,
    payload: SendCaseFormAssignmentDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> =>
    sendCaseFormAssignment(repository, db, caseId, assignmentId, payload, userId, organizationId),
  reviewAssignment: (
    caseId: string,
    assignmentId: string,
    payload: CaseFormReviewDecision,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> =>
    reviewCaseFormAssignment(repository, db, caseId, assignmentId, payload, userId, organizationId),
  getResponsePacketForCase: (
    caseId: string,
    assignmentId: string,
    organizationId?: string
  ): Promise<DownloadableFile> =>
    getCaseFormResponsePacketForCase(repository, db, caseId, assignmentId, organizationId),
  getAssetForCase: (
    caseId: string,
    assignmentId: string,
    assetId: string,
    organizationId?: string
  ): Promise<DownloadableFile> =>
    getCaseFormAssetForCase(repository, db, caseId, assignmentId, assetId, organizationId),
});

export type StaffCaseFormsFacade = ReturnType<typeof createStaffCaseFormsFacade>;
