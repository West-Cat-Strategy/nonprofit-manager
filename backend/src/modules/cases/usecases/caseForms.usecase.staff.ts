import crypto from 'crypto';
import type { Pool, PoolClient } from 'pg';
import { sendMail } from '@services/emailService';
import { uploadFile } from '@services/fileStorageService';
import { sendSms } from '@services/twilioSmsService';
import { hashData } from '@utils/encryption';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormDeliveryChannel,
  CaseFormDeliveryTarget,
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
  noteContent,
  resolveDraftStatus,
  resolveExpiryDate,
} from './caseForms.usecase.shared';

type Db = Pool | PoolClient;

interface CaseFormTemplateListFilters {
  status?: 'draft' | 'published' | 'archived';
  caseTypeId?: string | null;
}

const DELIVERY_CHANNEL_ORDER: CaseFormDeliveryChannel[] = ['portal', 'email', 'sms'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeDeliveryChannels = (payload: SendCaseFormAssignmentDTO): CaseFormDeliveryChannel[] => {
  const channels = new Set<CaseFormDeliveryChannel>();
  const requested = payload.delivery_channels?.length
    ? payload.delivery_channels
    : payload.delivery_target === 'portal_and_email'
      ? (['portal', 'email'] satisfies CaseFormDeliveryChannel[])
      : payload.delivery_target
        ? ([payload.delivery_target] satisfies CaseFormDeliveryChannel[])
        : [];

  for (const channel of requested) {
    channels.add(channel);
  }

  return DELIVERY_CHANNEL_ORDER.filter((channel) => channels.has(channel));
};

const deriveLegacyDeliveryTarget = (
  channels: CaseFormDeliveryChannel[]
): CaseFormDeliveryTarget | null => {
  const channelSet = new Set(channels);
  if (channelSet.has('portal') && channelSet.has('email')) {
    return 'portal_and_email';
  }
  if (channelSet.has('portal')) {
    return 'portal';
  }
  if (channelSet.has('email')) {
    return 'email';
  }
  return null;
};

const formatDeliveryChannelsLabel = (channels: CaseFormDeliveryChannel[]): string =>
  channels.map((channel) => (channel === 'sms' ? 'SMS' : channel)).join(', ');

const getContactDeliveryFallbacks = async (
  db: Db,
  contactId: string
): Promise<{ email: string | null; phone: string | null }> => {
  if (!UUID_PATTERN.test(contactId)) {
    return { email: null, phone: null };
  }

  const result = await db.query<{
    email: string | null;
    phone: string | null;
    mobile_phone: string | null;
  }>(
    `SELECT email, phone, mobile_phone
     FROM contacts
     WHERE id = $1
     LIMIT 1`,
    [contactId]
  );
  const row = result.rows[0];
  return {
    email: row?.email?.trim() || null,
    phone: row?.mobile_phone?.trim() || row?.phone?.trim() || null,
  };
};

const hasActivePortalAccount = async (db: Db, contactId: string): Promise<boolean> => {
  if (!UUID_PATTERN.test(contactId)) {
    return false;
  }

  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM portal_users
       WHERE contact_id = $1
         AND status = 'active'
       LIMIT 1
     ) AS exists`,
    [contactId]
  );
  return result.rows[0]?.exists === true;
};

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

export const listCaseFormDefaults = async (
  repository: CaseFormsRepository,
  caseTypeId: string,
  organizationId?: string
): Promise<CaseFormDefault[]> => repository.listDefaultsByCaseType(caseTypeId, organizationId);

export const listCaseFormTemplates = async (
  repository: CaseFormsRepository,
  filters: CaseFormTemplateListFilters,
  organizationId?: string
): Promise<CaseFormDefault[]> =>
  repository.listTemplates({
    organizationId: organizationId || null,
    status: filters.status,
    caseTypeId: filters.caseTypeId,
  });

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
      templateStatus: payload.template_status || 'published',
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
      templateStatus: payload.template_status,
      autosave: payload.autosave === true,
      userId: userId || null,
    })
  );
};

export const createCaseFormTemplate = async (
  repository: CaseFormsRepository,
  payload: CreateCaseFormDefaultDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseFormDefault> =>
  repository.withTransaction((client) =>
    repository.createDefault(client, {
      caseTypeId: payload.case_type_id ?? null,
      organizationId: organizationId || null,
      title: payload.title,
      description: payload.description || null,
      schema: payload.schema,
      isActive: payload.is_active !== false,
      templateStatus: payload.template_status || 'draft',
      savedFromAssignmentId: payload.saved_from_assignment_id ?? null,
      autosave: true,
      userId: userId || null,
    })
  );

export const autosaveCaseFormTemplate = async (
  repository: CaseFormsRepository,
  templateId: string,
  payload: UpdateCaseFormDefaultDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseFormDefault> => {
  const current = await repository.getDefaultById(templateId, organizationId);
  if (!current) {
    throw Object.assign(new Error('Form template not found'), { statusCode: 404, code: 'not_found' });
  }

  return repository.withTransaction((client) =>
    repository.updateDefault(client, templateId, {
      title: payload.title,
      description: payload.description,
      schema: payload.schema,
      isActive: payload.is_active,
      caseTypeId: payload.case_type_id,
      templateStatus: payload.template_status,
      autosave: true,
      userId: userId || null,
    })
  );
};

export const saveCaseFormAssignmentAsTemplate = async (
  repository: CaseFormsRepository,
  db: Db,
  caseId: string,
  assignmentId: string,
  payload: CreateCaseFormDefaultDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseFormDefault> => {
  const assignment = await getCaseAssignment(repository, db, caseId, assignmentId, organizationId);
  return repository.withTransaction((client) =>
    repository.createDefault(client, {
      caseTypeId: payload.case_type_id ?? assignment.case_type_id ?? null,
      organizationId: organizationId || assignment.account_id || null,
      title: payload.title || assignment.title,
      description: payload.description ?? assignment.description ?? null,
      schema: payload.schema || assignment.schema,
      isActive: payload.is_active !== false,
      templateStatus: payload.template_status || 'draft',
      savedFromAssignmentId: assignment.id,
      autosave: true,
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
      recipientPhone: payload.recipient_phone || null,
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
    includeEvidenceEvents: true,
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
      recipientPhone: payload.recipient_phone,
      status: payload.status,
      structureAutosave: payload.autosave === true,
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
    payload,
    {
      responsePacketDownloadUrl: `/api/v2/cases/${assignment.case_id}/forms/${assignment.id}/response-packet`,
      buildAssetDownloadUrl: (assetId) =>
        `/api/v2/cases/${assignment.case_id}/forms/${assignment.id}/assets/${assetId}/download`,
      includeEvidenceEvents: true,
    }
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

  const deliveryChannels = normalizeDeliveryChannels(payload);
  if (deliveryChannels.length === 0) {
    throw Object.assign(new Error('At least one delivery channel is required'), {
      statusCode: 400,
      code: 'validation_error',
    });
  }

  const portalDeliveryEnabled = deliveryChannels.includes('portal');
  const emailDeliveryEnabled = deliveryChannels.includes('email');
  const smsDeliveryEnabled = deliveryChannels.includes('sms');
  const needsContactFallback =
    (emailDeliveryEnabled && !payload.recipient_email?.trim() && !assignment.recipient_email?.trim()) ||
    (smsDeliveryEnabled && !payload.recipient_phone?.trim() && !assignment.recipient_phone?.trim());
  const contactFallbacks = needsContactFallback
    ? await getContactDeliveryFallbacks(db, assignment.contact_id)
    : { email: null, phone: null };
  const portalAllowed =
    assignment.client_viewable === true ||
    (portalDeliveryEnabled ? await hasActivePortalAccount(db, assignment.contact_id) : false);

  if (portalDeliveryEnabled && !portalAllowed) {
    throw Object.assign(
      new Error('This client needs portal access or a client-visible case before portal delivery'),
      { statusCode: 400, code: 'validation_error' }
    );
  }

  const recipientEmail = emailDeliveryEnabled
    ? payload.recipient_email?.trim() || assignment.recipient_email?.trim() || contactFallbacks.email
    : assignment.recipient_email?.trim() || null;
  const recipientPhone = smsDeliveryEnabled
    ? payload.recipient_phone?.trim() || assignment.recipient_phone?.trim() || contactFallbacks.phone
    : assignment.recipient_phone?.trim() || null;

  if (emailDeliveryEnabled && !recipientEmail) {
    throw Object.assign(new Error('Recipient email is required for email delivery'), {
      statusCode: 400,
      code: 'validation_error',
    });
  }
  if (smsDeliveryEnabled && !recipientPhone) {
    throw Object.assign(new Error('Recipient phone is required for SMS delivery'), {
      statusCode: 400,
      code: 'validation_error',
    });
  }

  const secureLinkDeliveryEnabled = emailDeliveryEnabled || smsDeliveryEnabled;
  const rawToken = secureLinkDeliveryEnabled ? crypto.randomBytes(24).toString('base64url') : null;
  const tokenHash = rawToken ? hashData(rawToken) : null;
  const expiresAt = secureLinkDeliveryEnabled ? resolveExpiryDate(assignment, payload.expires_in_days) : null;
  const sentAt = new Date();
  const legacyDeliveryTarget = deriveLegacyDeliveryTarget(deliveryChannels);
  const accessLink = rawToken ? buildAccessLinkUrl(rawToken) : null;

  if (emailDeliveryEnabled && recipientEmail && accessLink && expiresAt) {
    const mailSent = await sendMail({
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
    if (!mailSent) {
      throw Object.assign(new Error('Email delivery failed'), {
        statusCode: 502,
        code: 'email_delivery_failed',
      });
    }
  }

  if (smsDeliveryEnabled && recipientPhone && accessLink && expiresAt) {
    const smsResult = await sendSms({
      to: recipientPhone,
      body: [
        `Please complete your form: ${assignment.title}`,
        accessLink,
        `This secure link expires on ${expiresAt.toISOString()}.`,
      ].join('\n'),
    });
    if (!smsResult.success) {
      throw Object.assign(new Error(smsResult.error || 'SMS delivery failed'), {
        statusCode: 502,
        code: 'sms_delivery_failed',
      });
    }
  }

  const refreshed = await repository.withTransaction(async (client) => {
    await repository.revokeAccessTokens(client, assignment.id);

    if (secureLinkDeliveryEnabled && tokenHash && expiresAt) {
      await repository.createAccessToken(client, {
        assignmentId: assignment.id,
        caseId: assignment.case_id,
        contactId: assignment.contact_id,
        recipientEmail: recipientEmail || null,
        recipientPhone: recipientPhone || null,
        deliveryChannel: emailDeliveryEnabled ? 'email' : 'sms',
        tokenHash,
        expiresAt,
        userId,
      });
    }

    const updatedAssignment = await repository.updateAssignment(client, assignment.id, {
      recipientEmail,
      recipientPhone,
      status: 'sent',
      deliveryTarget: legacyDeliveryTarget,
      deliveryChannels,
      userId,
    });
    await repository.markAssignmentSent(client, assignment.id);
    await repository.createAssignmentEvent(client, {
      assignmentId: assignment.id,
      caseId: assignment.case_id,
      contactId: assignment.contact_id,
      accountId: assignment.account_id || null,
      eventType: 'opened',
      actorType: 'staff',
      actorUserId: userId || null,
      metadata: {
        delivery_channels: deliveryChannels.join(','),
        email_requested: emailDeliveryEnabled ? 1 : 0,
        sms_requested: smsDeliveryEnabled ? 1 : 0,
        portal_requested: portalDeliveryEnabled ? 1 : 0,
      },
    });
    await createLifecycleNote(
      client,
      assignment.case_id,
      noteContent(
        'opened to client',
        assignment.title,
        [
          `Delivered via ${formatDeliveryChannelsLabel(deliveryChannels)}.`,
          emailDeliveryEnabled && recipientEmail ? `Recipient: ${recipientEmail}.` : null,
          smsDeliveryEnabled && recipientPhone ? `SMS: ${recipientPhone}.` : null,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      userId || null
    );

    return {
      ...updatedAssignment,
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone,
      status: 'sent' as const,
      delivery_target: legacyDeliveryTarget,
      delivery_channels: deliveryChannels,
      sent_at: sentAt,
      updated_at: sentAt,
    };
  });

  return {
    ...refreshed,
    access_link_url: accessLink,
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
  const notes = payload.notes?.trim() || null;

  if (payload.decision === 'revision_requested' && !notes) {
    throw Object.assign(new Error('Revision notes are required when requesting changes'), {
      statusCode: 400,
      code: 'validation_error',
    });
  }

  const reviewPayload: CaseFormReviewDecision = {
    ...payload,
    notes,
  };

  await repository.withTransaction(async (client) => {
    await applyReviewFollowUpDecision(repository, client, assignment, reviewPayload, userId || null);
    await repository.markAssignmentReviewDecision(client, assignment.id, {
      status: reviewPayload.decision,
      notes,
      userId: userId || null,
    });
    await repository.createAssignmentEvent(client, {
      assignmentId: assignment.id,
      caseId: assignment.case_id,
      contactId: assignment.contact_id,
      accountId: assignment.account_id || null,
      eventType: reviewPayload.decision,
      actorType: 'staff',
      actorUserId: userId || null,
      metadata: {
        decision: reviewPayload.decision,
        notes_character_count: notes?.length ?? 0,
        review_follow_up_id: assignment.review_follow_up_id || null,
      },
    });
    await createLifecycleNote(
      client,
      assignment.case_id,
      noteContent(
        reviewPayload.decision === 'revision_requested' ? 'revision requested' : reviewPayload.decision,
        assignment.title,
        notes
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
  listTemplates: (
    filters: CaseFormTemplateListFilters,
    organizationId?: string
  ): Promise<CaseFormDefault[]> =>
    listCaseFormTemplates(repository, filters, organizationId),
  createTemplate: (
    payload: CreateCaseFormDefaultDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormDefault> =>
    createCaseFormTemplate(repository, payload, userId, organizationId),
  autosaveTemplate: (
    templateId: string,
    payload: UpdateCaseFormDefaultDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormDefault> =>
    autosaveCaseFormTemplate(repository, templateId, payload, userId, organizationId),
  saveAssignmentAsTemplate: (
    caseId: string,
    assignmentId: string,
    payload: CreateCaseFormDefaultDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormDefault> =>
    saveCaseFormAssignmentAsTemplate(repository, db, caseId, assignmentId, payload, userId, organizationId),
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
