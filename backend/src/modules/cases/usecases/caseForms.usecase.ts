import crypto from 'crypto';
import pool from '@config/database';
import type { PoolClient } from 'pg';
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
import {
  CaseFormsRepository,
  type CaseFormAssignmentRecord,
} from '../repositories/caseFormsRepository';
import { requireCaseOwnership } from '../queries/shared';
import {
  buildAssignmentDetail,
  createLifecycleNote,
  getCaseAssignment,
  getPortalAssignment,
  getPublicAccess,
} from './caseForms.usecase.access';
import { completeSubmission } from './caseForms.usecase.submission';
import {
  AssignmentDetailResult,
  buildReviewFollowUpResolutionNote,
  buildAccessLinkUrl,
  DownloadableFile,
  formatDeliveryTargetLabel,
  includesEmailDelivery,
  noteContent,
  resolveDraftStatus,
  resolveExpiryDate,
  ScopedPortalActor,
  TERMINAL_ASSIGNMENT_STATUSES,
} from './caseForms.usecase.shared';

const isTerminalAssignmentStatus = (status: CaseFormAssignmentRecord['status']): boolean =>
  TERMINAL_ASSIGNMENT_STATUSES.has(status);

export class CaseFormsUseCase {
  constructor(
    private readonly repository: CaseFormsRepository,
    private readonly db = pool
  ) {}

  private async applyReviewFollowUpDecision(
    client: PoolClient,
    assignment: CaseFormAssignmentRecord,
    payload: CaseFormReviewDecision,
    userId?: string | null
  ): Promise<void> {
    if (!assignment.review_follow_up_id || !assignment.account_id) {
      return;
    }

    const notes = buildReviewFollowUpResolutionNote(payload.decision, assignment.title, payload.notes);

    if (payload.decision === 'cancelled') {
      await this.repository.cancelReviewFollowUp(client, {
        organizationId: assignment.account_id,
        followUpId: assignment.review_follow_up_id,
        notes,
        userId: userId || null,
      });
      return;
    }

    await this.repository.completeReviewFollowUp(client, {
      organizationId: assignment.account_id,
      followUpId: assignment.review_follow_up_id,
      notes,
      userId: userId || null,
    });
  }

  async listDefaults(caseTypeId: string, organizationId?: string): Promise<CaseFormDefault[]> {
    return this.repository.listDefaultsByCaseType(caseTypeId, organizationId);
  }

  async createDefault(
    caseTypeId: string,
    payload: CreateCaseFormDefaultDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormDefault> {
    return this.repository.withTransaction((client) =>
      this.repository.createDefault(client, {
        caseTypeId,
        organizationId: organizationId || null,
        title: payload.title,
        description: payload.description || null,
        schema: payload.schema,
        isActive: payload.is_active !== false,
        userId: userId || null,
      })
    );
  }

  async updateDefault(
    caseTypeId: string,
    defaultId: string,
    payload: UpdateCaseFormDefaultDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormDefault> {
    const current = await this.repository.getDefaultById(defaultId, organizationId);
    if (!current || current.case_type_id !== caseTypeId) {
      throw Object.assign(new Error('Form default not found'), { statusCode: 404, code: 'not_found' });
    }
    return this.repository.withTransaction((client) =>
      this.repository.updateDefault(client, defaultId, {
        title: payload.title,
        description: payload.description,
        schema: payload.schema,
        isActive: payload.is_active,
        userId: userId || null,
      })
    );
  }

  async listRecommendedDefaults(caseId: string, organizationId?: string): Promise<CaseFormDefault[]> {
    await requireCaseOwnership(this.db, caseId, organizationId);
    return this.repository.listRecommendedDefaultsForCase(caseId, organizationId);
  }

  async listAssignmentsForCase(caseId: string, organizationId?: string): Promise<CaseFormAssignment[]> {
    await requireCaseOwnership(this.db, caseId, organizationId);
    return this.repository.listAssignmentsForCase(caseId, organizationId);
  }

  async createAssignment(
    caseId: string,
    payload: CreateCaseFormAssignmentDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> {
    const ownership = await requireCaseOwnership(this.db, caseId, organizationId);
    return this.repository.withTransaction((client) =>
      this.repository.createAssignment(client, {
        caseId,
        contactId: ownership.contact_id,
        accountId: ownership.account_id,
        caseTypeId: payload.case_type_id || null,
        sourceDefaultId: payload.source_default_id || null,
        title: payload.title,
        description: payload.description || null,
        schema: payload.schema,
        dueAt: payload.due_at || null,
        recipientEmail: payload.recipient_email || null,
        userId: userId || null,
      })
    );
  }

  async instantiateDefault(
    caseId: string,
    defaultId: string,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> {
    const ownership = await requireCaseOwnership(this.db, caseId, organizationId);
    const formDefault = await this.repository.getDefaultById(defaultId, organizationId);
    if (!formDefault) {
      throw Object.assign(new Error('Form default not found'), { statusCode: 404, code: 'not_found' });
    }

    return this.repository.withTransaction((client) =>
      this.repository.createAssignment(client, {
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
  }

  async getAssignmentDetailForCase(
    caseId: string,
    assignmentId: string,
    organizationId?: string
  ): Promise<AssignmentDetailResult> {
    const assignment = await getCaseAssignment(this.repository, this.db, caseId, assignmentId, organizationId);
    return buildAssignmentDetail(this.repository, assignment, {
      responsePacketDownloadUrl: `/api/v2/cases/${assignment.case_id}/forms/${assignment.id}/response-packet`,
      buildAssetDownloadUrl: (assetId) =>
        `/api/v2/cases/${assignment.case_id}/forms/${assignment.id}/assets/${assetId}/download`,
    });
  }

  async updateAssignmentForCase(
    caseId: string,
    assignmentId: string,
    payload: UpdateCaseFormAssignmentDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> {
    await getCaseAssignment(this.repository, this.db, caseId, assignmentId, organizationId);
    return this.repository.withTransaction((client) =>
      this.repository.updateAssignment(client, assignmentId, {
        title: payload.title,
        description: payload.description,
        schema: payload.schema,
        dueAt: payload.due_at,
        recipientEmail: payload.recipient_email,
        status: payload.status,
        userId,
      })
    );
  }

  async uploadAssetForCase(
    caseId: string,
    assignmentId: string,
    payload: { question_key: string; asset_kind: 'upload' | 'signature' },
    file: Express.Multer.File,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAsset> {
    const assignment = await getCaseAssignment(this.repository, this.db, caseId, assignmentId, organizationId);
    if (assignment.status === 'closed' || assignment.status === 'cancelled') {
      throw Object.assign(new Error('This form assignment can no longer accept uploads'), {
        statusCode: 409,
        code: 'assignment_closed',
      });
    }

    const upload = await uploadFile(file, `case-form-assets/${assignment.case_id}`);
    return this.repository.withTransaction((client) =>
      this.repository.createAsset(client, {
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
  }

  async saveDraftForCase(
    caseId: string,
    assignmentId: string,
    payload: SaveCaseFormDraftDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> {
    const assignment = await getCaseAssignment(this.repository, this.db, caseId, assignmentId, organizationId);
    if (assignment.status === 'closed' || assignment.status === 'cancelled') {
      throw Object.assign(new Error('This form assignment can no longer be edited'), {
        statusCode: 409,
        code: 'assignment_closed',
      });
    }

    return this.repository.withTransaction((client) =>
      this.repository.saveDraft(client, assignment.id, payload.answers, {
        status: resolveDraftStatus(assignment.status, 'staff'),
        userId: userId || null,
      })
    );
  }

  async submitForCase(
    caseId: string,
    assignmentId: string,
    payload: SubmitCaseFormDTO,
    userId?: string,
    organizationId?: string
  ): Promise<AssignmentDetailResult> {
    const assignment = await getCaseAssignment(this.repository, this.db, caseId, assignmentId, organizationId);
    return completeSubmission(
      this.repository,
      assignment,
      { actorType: 'staff', userId: userId || null },
      payload
    );
  }

  async sendAssignment(
    caseId: string,
    assignmentId: string,
    payload: SendCaseFormAssignmentDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> {
    const assignment = await getCaseAssignment(this.repository, this.db, caseId, assignmentId, organizationId);
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

    await this.repository.withTransaction(async (client) => {
      await this.repository.revokeAccessTokens(client, assignment.id);

      if (emailDeliveryEnabled && recipientEmail && tokenHash && expiresAt) {
        await this.repository.createAccessToken(client, {
          assignmentId: assignment.id,
          caseId: assignment.case_id,
          contactId: assignment.contact_id,
          recipientEmail,
          tokenHash,
          expiresAt,
          userId,
        });
      }

      await this.repository.updateAssignment(client, assignment.id, {
        recipientEmail,
        status: 'sent',
        deliveryTarget: payload.delivery_target,
        userId,
      });
      await this.repository.markAssignmentSent(client, assignment.id);
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

    const refreshed = await this.repository.getAssignmentById(assignment.id);
    if (!refreshed) {
      throw Object.assign(new Error('Form assignment not found after send'), { statusCode: 404, code: 'not_found' });
    }
    return {
      ...refreshed,
      access_link_url: rawToken ? buildAccessLinkUrl(rawToken) : null,
    };
  }

  async reviewAssignment(
    caseId: string,
    assignmentId: string,
    payload: CaseFormReviewDecision,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> {
    const assignment = await getCaseAssignment(this.repository, this.db, caseId, assignmentId, organizationId);
    await this.repository.withTransaction(async (client) => {
      await this.applyReviewFollowUpDecision(client, assignment, payload, userId || null);
      await this.repository.markAssignmentReviewDecision(client, assignment.id, {
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

    const refreshed = await this.repository.getAssignmentById(assignment.id);
    if (!refreshed) {
      throw Object.assign(new Error('Form assignment not found after review'), { statusCode: 404, code: 'not_found' });
    }
    return refreshed;
  }

  async getResponsePacketForCase(
    caseId: string,
    assignmentId: string,
    organizationId?: string
  ): Promise<DownloadableFile> {
    const detail = await this.getAssignmentDetailForCase(caseId, assignmentId, organizationId);
    const latest = detail.assignment.latest_submission;
    if (!latest?.response_packet_file_path || !latest.response_packet_file_name) {
      throw Object.assign(new Error('Response packet not found'), { statusCode: 404, code: 'not_found' });
    }
    return {
      fileName: latest.response_packet_file_name,
      filePath: latest.response_packet_file_path,
      mimeType: 'application/pdf',
    };
  }

  async getAssetForCase(
    caseId: string,
    assignmentId: string,
    assetId: string,
    organizationId?: string
  ): Promise<DownloadableFile> {
    const assignment = await getCaseAssignment(this.repository, this.db, caseId, assignmentId, organizationId);
    const assets = await this.repository.listAssetsForAssignment(assignment.id);
    const asset = assets.find((candidate) => candidate.id === assetId);
    if (!asset) {
      throw Object.assign(new Error('Form asset not found'), { statusCode: 404, code: 'not_found' });
    }
    return {
      fileName: asset.original_name,
      filePath: asset.file_path,
      mimeType: asset.mime_type,
    };
  }

  async listAssignmentsForPortal(contactId: string, status?: string): Promise<CaseFormAssignment[]> {
    return this.repository.listAssignmentsForPortal(contactId, status);
  }

  async getAssignmentDetailForPortal(
    input: ScopedPortalActor,
    assignmentId: string
  ): Promise<AssignmentDetailResult> {
    const assignment = await getPortalAssignment(this.repository, input, assignmentId);
    await this.repository.withTransaction(async (client) => {
      await this.repository.markAssignmentViewed(client, assignment.id);
    });
    const refreshed = await getPortalAssignment(this.repository, input, assignmentId);
    return buildAssignmentDetail(this.repository, refreshed, {
      responsePacketDownloadUrl: `/api/v2/portal/forms/${refreshed.id}/response-packet`,
      buildAssetDownloadUrl: null,
    });
  }

  async uploadAssetForPortal(
    input: ScopedPortalActor,
    assignmentId: string,
    payload: { question_key: string; asset_kind: 'upload' | 'signature' },
    file: Express.Multer.File
  ): Promise<CaseFormAsset> {
    const assignment = await getPortalAssignment(this.repository, input, assignmentId);
    if (isTerminalAssignmentStatus(assignment.status)) {
      throw Object.assign(new Error('This form assignment can no longer accept uploads'), {
        statusCode: 409,
        code: 'assignment_closed',
      });
    }

    const upload = await uploadFile(file, `case-form-assets/${assignment.case_id}`);
    return this.repository.withTransaction(async (client) => {
      await this.repository.markAssignmentViewed(client, assignment.id);
      return this.repository.createAsset(client, {
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
  }

  async saveDraftForPortal(
    input: ScopedPortalActor,
    assignmentId: string,
    payload: SaveCaseFormDraftDTO
  ): Promise<CaseFormAssignment> {
    const assignment = await getPortalAssignment(this.repository, input, assignmentId);
    if (isTerminalAssignmentStatus(assignment.status)) {
      throw Object.assign(new Error('This form assignment can no longer be edited'), {
        statusCode: 409,
        code: 'assignment_closed',
      });
    }
    return this.repository.withTransaction(async (client) => {
      await this.repository.markAssignmentViewed(client, assignment.id);
      return this.repository.saveDraft(client, assignment.id, payload.answers, {
        status: resolveDraftStatus(assignment.status, 'portal'),
      });
    });
  }

  async submitForPortal(
    input: ScopedPortalActor,
    assignmentId: string,
    payload: SubmitCaseFormDTO
  ): Promise<AssignmentDetailResult> {
    const assignment = await getPortalAssignment(this.repository, input, assignmentId);
    return completeSubmission(
      this.repository,
      assignment,
      { actorType: 'portal', portalUserId: input.portalUserId || null },
      payload
    );
  }

  async getResponsePacketForPortal(
    input: ScopedPortalActor,
    assignmentId: string
  ): Promise<DownloadableFile> {
    const assignment = await getPortalAssignment(this.repository, input, assignmentId);
    const detail = await buildAssignmentDetail(this.repository, assignment);
    const latest = detail.assignment.latest_submission;
    if (!latest?.response_packet_file_path || !latest.response_packet_file_name) {
      throw Object.assign(new Error('Response packet not found'), { statusCode: 404, code: 'not_found' });
    }
    return {
      fileName: latest.response_packet_file_name,
      filePath: latest.response_packet_file_path,
      mimeType: 'application/pdf',
    };
  }

  async getAssignmentDetailByToken(rawToken: string): Promise<AssignmentDetailResult> {
    const access = await getPublicAccess(this.repository, rawToken);
    await this.repository.withTransaction(async (client) => {
      await this.repository.markAssignmentViewed(client, access.token.assignment.id);
      await this.repository.markAccessTokenViewed(client, access.token.id);
    });
    const assignment = await this.repository.getAssignmentById(access.token.assignment.id);
    if (!assignment) {
      throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
    }
    return buildAssignmentDetail(this.repository, assignment, {
      responsePacketDownloadUrl: `/api/v2/public/case-forms/${rawToken}/response-packet`,
      buildAssetDownloadUrl: null,
    });
  }

  async uploadAssetByToken(
    rawToken: string,
    payload: { question_key: string; asset_kind: 'upload' | 'signature' },
    file: Express.Multer.File
  ): Promise<CaseFormAsset> {
    const access = await getPublicAccess(this.repository, rawToken);
    const assignment = access.token.assignment as CaseFormAssignmentRecord;
    if (isTerminalAssignmentStatus(assignment.status)) {
      throw Object.assign(new Error('This form assignment can no longer accept uploads'), {
        statusCode: 409,
        code: 'assignment_closed',
      });
    }

    const upload = await uploadFile(file, `case-form-assets/${assignment.case_id}`);
    return this.repository.withTransaction(async (client) => {
      await this.repository.markAssignmentViewed(client, assignment.id);
      await this.repository.markAccessTokenViewed(client, access.token.id);
      return this.repository.createAsset(client, {
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
  }

  async saveDraftByToken(rawToken: string, payload: SaveCaseFormDraftDTO): Promise<CaseFormAssignment> {
    const access = await getPublicAccess(this.repository, rawToken);
    const assignment = access.token.assignment;
    if (isTerminalAssignmentStatus(assignment.status)) {
      throw Object.assign(new Error('This form assignment can no longer be edited'), {
        statusCode: 409,
        code: 'assignment_closed',
      });
    }
    return this.repository.withTransaction(async (client) => {
      await this.repository.markAssignmentViewed(client, assignment.id);
      await this.repository.markAccessTokenViewed(client, access.token.id);
      return this.repository.saveDraft(client, assignment.id, payload.answers, {
        status: resolveDraftStatus(assignment.status, 'public'),
      });
    });
  }

  async submitByToken(rawToken: string, payload: SubmitCaseFormDTO): Promise<AssignmentDetailResult> {
    const access = await getPublicAccess(this.repository, rawToken);
    return completeSubmission(
      this.repository,
      access.token.assignment,
      { actorType: 'public', accessTokenId: access.token.id },
      payload
    );
  }

  async getResponsePacketByToken(rawToken: string): Promise<DownloadableFile> {
    const access = await getPublicAccess(this.repository, rawToken);
    const detail = await buildAssignmentDetail(this.repository, access.token.assignment);
    const latest = detail.assignment.latest_submission;
    if (!latest?.response_packet_file_path || !latest.response_packet_file_name) {
      throw Object.assign(new Error('Response packet not found'), { statusCode: 404, code: 'not_found' });
    }
    return {
      fileName: latest.response_packet_file_name,
      filePath: latest.response_packet_file_path,
      mimeType: 'application/pdf',
    };
  }
}
