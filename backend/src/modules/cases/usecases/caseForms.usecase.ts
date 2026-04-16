import crypto from 'crypto';
import pool from '@config/database';
import type { PoolClient } from 'pg';
import { createCaseNoteQuery } from '../queries/notesQueries';
import { requireCaseOwnership } from '../queries/shared';
import { sendMail } from '@services/emailService';
import { uploadFile } from '@services/fileStorageService';
import { hashData } from '@utils/encryption';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormAssignmentStatus,
  CaseFormDefault,
  CaseFormLogicRule,
  CaseFormQuestion,
  CaseFormReviewDecision,
  CaseFormSchema,
  CaseFormSubmission,
  CreateCaseFormAssignmentDTO,
  CreateCaseFormDefaultDTO,
  SaveCaseFormDraftDTO,
  SendCaseFormAssignmentDTO,
  SubmitCaseFormDTO,
  UpdateCaseFormAssignmentDTO,
  UpdateCaseFormDefaultDTO,
} from '@app-types/caseForms';
import { generateCaseFormResponsePacket } from '../services/caseFormPacketService';
import {
  CaseFormsRepository,
  type CaseFormAccessTokenRecord,
  type CaseFormAssignmentRecord,
} from '../repositories/caseFormsRepository';

interface ScopedPortalActor {
  contactId: string;
  portalUserId?: string | null;
}

interface ScopedPublicActor {
  token: CaseFormAccessTokenRecord;
}

interface AssignmentDetailResult {
  assignment: CaseFormAssignment;
  submissions: CaseFormSubmission[];
}

interface DownloadableFile {
  fileName: string;
  filePath: string;
  mimeType: string;
}

interface FlattenedQuestion {
  sectionTitle: string;
  question: CaseFormQuestion;
}

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const TERMINAL_ASSIGNMENT_STATUSES = new Set<CaseFormAssignmentStatus>([
  'submitted',
  'reviewed',
  'closed',
  'expired',
  'cancelled',
]);

const CONTACT_FIELD_COERCERS: Record<string, (value: unknown) => unknown> = {
  first_name: (value) => String(value ?? '').trim(),
  preferred_name: (value) => String(value ?? '').trim(),
  last_name: (value) => String(value ?? '').trim(),
  middle_name: (value) => String(value ?? '').trim(),
  salutation: (value) => String(value ?? '').trim(),
  suffix: (value) => String(value ?? '').trim(),
  email: (value) => String(value ?? '').trim(),
  phone: (value) => String(value ?? '').trim(),
  mobile_phone: (value) => String(value ?? '').trim(),
  birth_date: (value) => String(value ?? '').trim(),
  gender: (value) => String(value ?? '').trim(),
  pronouns: (value) => String(value ?? '').trim(),
  address_line1: (value) => String(value ?? '').trim(),
  address_line2: (value) => String(value ?? '').trim(),
  city: (value) => String(value ?? '').trim(),
  state_province: (value) => String(value ?? '').trim(),
  postal_code: (value) => String(value ?? '').trim(),
  country: (value) => String(value ?? '').trim(),
  job_title: (value) => String(value ?? '').trim(),
  department: (value) => String(value ?? '').trim(),
  preferred_contact_method: (value) => String(value ?? '').trim(),
  no_fixed_address: (value) => Boolean(value),
  do_not_email: (value) => Boolean(value),
  do_not_phone: (value) => Boolean(value),
  do_not_sms: (value) => Boolean(value),
  do_not_voicemail: (value) => Boolean(value),
};

const stableSerialize = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
};

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const ruleMatches = (rule: CaseFormLogicRule, answers: Record<string, unknown>): boolean => {
  const current = answers[rule.question_key];
  switch (rule.operator) {
    case 'equals':
      return stableSerialize(current) === stableSerialize(rule.value);
    case 'not_equals':
      return stableSerialize(current) !== stableSerialize(rule.value);
    case 'contains':
      if (Array.isArray(current)) {
        return current.some((item) => stableSerialize(item) === stableSerialize(rule.value));
      }
      if (typeof current === 'string') {
        return current.toLowerCase().includes(String(rule.value ?? '').toLowerCase());
      }
      return false;
    case 'not_contains':
      return !ruleMatches({ ...rule, operator: 'contains' }, answers);
    case 'answered':
      return !isEmptyValue(current);
    case 'not_answered':
      return isEmptyValue(current);
    case 'truthy':
      return Boolean(current);
    case 'falsy':
      return !current;
    default:
      return false;
  }
};

const isQuestionVisible = (question: CaseFormQuestion, answers: Record<string, unknown>): boolean => {
  if (!question.visible_when || question.visible_when.length === 0) {
    return true;
  }
  return question.visible_when.every((rule) => ruleMatches(rule, answers));
};

const extractAssetIds = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.trim() ? [value.trim()] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractAssetIds(item));
  }
  if (value && typeof value === 'object') {
    const candidate = value as { id?: unknown };
    if (typeof candidate.id === 'string' && candidate.id.trim()) {
      return [candidate.id.trim()];
    }
  }
  return [];
};

const normalizeAnswerForValidation = (question: CaseFormQuestion, value: unknown): unknown => {
  if (value === undefined) {
    return value;
  }

  switch (question.type) {
    case 'number': {
      if (typeof value === 'number') return value;
      const parsed = Number.parseFloat(String(value));
      if (Number.isFinite(parsed)) return parsed;
      return value;
    }
    case 'checkbox':
      if (question.multiple && !Array.isArray(value)) {
        return extractAssetIds(value);
      }
      return value;
    default:
      return value;
  }
};

const validateAnswers = (
  schema: CaseFormSchema,
  answers: Record<string, unknown>
): { normalizedAnswers: Record<string, unknown>; visibleQuestions: FlattenedQuestion[] } => {
  const normalizedAnswers = { ...answers };
  const visibleQuestions: FlattenedQuestion[] = [];
  const errors: string[] = [];

  for (const section of schema.sections) {
    for (const question of section.questions) {
      const current = normalizeAnswerForValidation(question, normalizedAnswers[question.key]);
      normalizedAnswers[question.key] = current;

      if (!isQuestionVisible(question, normalizedAnswers)) {
        continue;
      }

      visibleQuestions.push({ sectionTitle: section.title, question });
      const missingRequired =
        question.required === true &&
        (question.type === 'checkbox' && !question.multiple
          ? current !== true
          : isEmptyValue(current));

      if (missingRequired) {
        errors.push(`${question.label} is required`);
        continue;
      }

      if (isEmptyValue(current)) {
        continue;
      }

      switch (question.type) {
        case 'email':
          if (typeof current !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.trim())) {
            errors.push(`${question.label} must be a valid email address`);
          }
          break;
        case 'number':
          if (typeof current !== 'number' || !Number.isFinite(current)) {
            errors.push(`${question.label} must be a number`);
          }
          break;
        case 'date':
          if (typeof current !== 'string' || Number.isNaN(Date.parse(current))) {
            errors.push(`${question.label} must be a valid date`);
          }
          break;
        case 'select':
        case 'radio': {
          const options = new Set((question.options || []).map((option) => option.value));
          if (question.multiple) {
            if (!Array.isArray(current) || current.some((item) => !options.has(String(item)))) {
              errors.push(`${question.label} contains an invalid selection`);
            }
          } else if (typeof current !== 'string' || !options.has(current)) {
            errors.push(`${question.label} contains an invalid selection`);
          }
          break;
        }
        case 'checkbox':
          if (question.multiple) {
            if (!Array.isArray(current)) {
              errors.push(`${question.label} must be an array`);
            }
          } else if (typeof current !== 'boolean') {
            errors.push(`${question.label} must be checked or unchecked`);
          }
          break;
        case 'file':
        case 'signature': {
          const assetIds = extractAssetIds(current);
          if (assetIds.length === 0) {
            errors.push(`${question.label} requires an uploaded asset`);
          }
          break;
        }
        default:
          if (typeof current !== 'string') {
            errors.push(`${question.label} must be text`);
          }
      }
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), {
      statusCode: 400,
      code: 'validation_error',
    });
  }

  return { normalizedAnswers, visibleQuestions };
};

const formatAnswerValue = (
  question: CaseFormQuestion,
  value: unknown,
  assetLookup: Map<string, CaseFormAsset>
): string => {
  if (isEmptyValue(value)) {
    return '—';
  }

  if (question.type === 'file' || question.type === 'signature') {
    const assetIds = extractAssetIds(value);
    if (assetIds.length === 0) {
      return '—';
    }
    return assetIds
      .map((assetId) => assetLookup.get(assetId)?.original_name || assetId)
      .join(', ');
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const toActorLabel = (actorType: 'staff' | 'portal' | 'public'): string => {
  if (actorType === 'portal') return 'Portal client';
  if (actorType === 'public') return 'Secure email link';
  return 'Staff';
};

const buildAccessLinkUrl = (rawToken: string): string => `${FRONTEND_URL}/public/case-forms/${rawToken}`;

const resolveDraftStatus = (
  currentStatus: CaseFormAssignmentStatus,
  actorType: 'staff' | 'portal' | 'public'
): CaseFormAssignmentStatus => {
  if (currentStatus === 'draft' && actorType === 'staff') {
    return 'draft';
  }
  if (['draft', 'sent', 'viewed', 'in_progress'].includes(currentStatus)) {
    return actorType === 'staff' && currentStatus === 'draft' ? 'draft' : 'in_progress';
  }
  return currentStatus;
};

const resolveExpiryDate = (
  assignment: CaseFormAssignment,
  requestedDays?: number
): Date => {
  const now = new Date();
  const defaultExpiry = new Date(now.getTime() + (requestedDays ?? 7) * 24 * 60 * 60 * 1000);
  if (!assignment.due_at) {
    return defaultExpiry;
  }

  const dueAt = new Date(assignment.due_at);
  if (Number.isNaN(dueAt.getTime())) {
    return defaultExpiry;
  }

  return dueAt.getTime() < defaultExpiry.getTime() ? dueAt : defaultExpiry;
};

const noteContent = (action: string, assignmentTitle: string, detail?: string | null): string =>
  detail ? `Case form ${action}: ${assignmentTitle}. ${detail}` : `Case form ${action}: ${assignmentTitle}.`;

export class CaseFormsUseCase {
  constructor(
    private readonly repository: CaseFormsRepository,
    private readonly db = pool
  ) {}

  private async getCaseAssignment(
    caseId: string,
    assignmentId: string,
    organizationId?: string
  ): Promise<CaseFormAssignmentRecord> {
    await requireCaseOwnership(this.db, caseId, organizationId);
    const assignment = await this.repository.getAssignmentById(assignmentId);
    if (!assignment || assignment.case_id !== caseId) {
      throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
    }
    return assignment;
  }

  private async getPortalAssignment(input: ScopedPortalActor, assignmentId: string): Promise<CaseFormAssignmentRecord> {
    const assignment = await this.repository.getAssignmentById(assignmentId);
    if (
      !assignment ||
      assignment.contact_id !== input.contactId ||
      assignment.client_viewable !== true
    ) {
      throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
    }
    return assignment;
  }

  private async getPublicAccess(rawToken: string): Promise<ScopedPublicActor> {
    const tokenHash = hashData(rawToken);
    const token = await this.repository.getAccessTokenByHash(tokenHash);
    if (!token) {
      throw Object.assign(new Error('Form access link not found'), { statusCode: 404, code: 'not_found' });
    }

    if (token.assignment.client_viewable !== true) {
      throw Object.assign(new Error('Form access link not found'), { statusCode: 404, code: 'not_found' });
    }

    if (token.revoked_at) {
      throw Object.assign(new Error('Form access link has been revoked'), { statusCode: 410, code: 'gone' });
    }

    const expiresAt = new Date(token.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      await this.repository.withTransaction(async (client) => {
        await this.repository.updateAssignment(client, token.assignment.id, {
          status: 'expired',
        });
      });
      throw Object.assign(new Error('Form access link has expired'), { statusCode: 410, code: 'expired' });
    }

    return { token };
  }

  private async buildAssignmentDetail(
    assignment: CaseFormAssignmentRecord,
    options: {
      responsePacketDownloadUrl?: string | null;
      buildAssetDownloadUrl?: ((assetId: string) => string) | null;
    } = {}
  ): Promise<AssignmentDetailResult> {
    const submissions = await this.repository.listSubmissionsForAssignment(assignment.id);
    const assignmentAssets = await this.repository.listAssetsForAssignment(assignment.id);
    const assets = submissions.length
      ? await this.repository.listAssetsForSubmissionIds(submissions.map((submission) => submission.id))
      : [];
    const assetsBySubmission = new Map<string, CaseFormAsset[]>();

    for (const asset of assets) {
      if (!asset.submission_id) continue;
      const list = assetsBySubmission.get(asset.submission_id) || [];
      list.push(asset);
      assetsBySubmission.set(asset.submission_id, list);
    }

    const hydratedSubmissions = submissions.map((submission) => {
      const submissionAssets = assetsBySubmission.get(submission.id) || [];
      return {
        ...submission,
        asset_refs: submissionAssets
          .filter((asset) => asset.asset_kind === 'upload')
          .map((asset) => ({
            ...asset,
            download_url: options.buildAssetDownloadUrl ? options.buildAssetDownloadUrl(asset.id) : null,
          })),
        signature_refs: submissionAssets
          .filter((asset) => asset.asset_kind === 'signature')
          .map((asset) => ({
            ...asset,
            download_url: options.buildAssetDownloadUrl ? options.buildAssetDownloadUrl(asset.id) : null,
          })),
        response_packet_download_url:
          submission.response_packet_file_path && options.responsePacketDownloadUrl
            ? options.responsePacketDownloadUrl
            : null,
      } as CaseFormSubmission;
    });

    const plainAssignment: CaseFormAssignment = {
      ...assignment,
      draft_assets: assignmentAssets
        .filter((asset) => !asset.submission_id)
        .map((asset) => ({
          ...asset,
          download_url: options.buildAssetDownloadUrl ? options.buildAssetDownloadUrl(asset.id) : null,
        })),
      latest_submission: hydratedSubmissions[0] || null,
    };

    return {
      assignment: plainAssignment,
      submissions: hydratedSubmissions,
    };
  }

  private async createLifecycleNote(
    client: PoolClient,
    caseId: string,
    content: string,
    userId?: string | null
  ): Promise<void> {
    await createCaseNoteQuery(
      client,
      {
        case_id: caseId,
        note_type: 'system',
        content,
        is_internal: true,
        visible_to_client: false,
      },
      userId || undefined
    );
  }

  private resolveSelectedAssets(
    visibleQuestions: FlattenedQuestion[],
    answers: Record<string, unknown>,
    assignmentAssets: CaseFormAsset[],
    assignmentId: string
  ): CaseFormAsset[] {
    const assetIds = new Set<string>();
    for (const item of visibleQuestions) {
      if (item.question.type !== 'file' && item.question.type !== 'signature') {
        continue;
      }
      for (const assetId of extractAssetIds(answers[item.question.key])) {
        assetIds.add(assetId);
      }
    }

    const assetLookup = new Map(assignmentAssets.map((asset) => [asset.id, asset]));
    const selected = Array.from(assetIds).map((assetId) => assetLookup.get(assetId)).filter(Boolean) as CaseFormAsset[];
    const invalidAsset = selected.find((asset) => asset.assignment_id !== assignmentId);
    if (invalidAsset) {
      throw Object.assign(new Error('One or more selected assets do not belong to this form assignment'), {
        statusCode: 400,
        code: 'invalid_asset',
      });
    }
    if (selected.length !== assetIds.size) {
      throw Object.assign(new Error('One or more selected assets could not be found'), {
        statusCode: 400,
        code: 'missing_asset',
      });
    }
    return selected;
  }

  private async buildSubmissionArtifacts(input: {
    assignment: CaseFormAssignmentRecord;
    answers: Record<string, unknown>;
    visibleQuestions: FlattenedQuestion[];
    assets: CaseFormAsset[];
    submissionNumber: number;
    actorType: 'staff' | 'portal' | 'public';
  }): Promise<{
    packetUpload: {
      fileName: string;
      filePath: string;
      fileSize: number;
    };
    packetOriginalFileName: string;
  }> {
    const assetLookup = new Map(input.assets.map((asset) => [asset.id, asset]));
    const packet = await generateCaseFormResponsePacket({
      assignmentTitle: input.assignment.title,
      assignmentDescription: input.assignment.description,
      caseNumber: input.assignment.case_number,
      caseTitle: input.assignment.case_title,
      contactName: [input.assignment.contact_first_name, input.assignment.contact_last_name].filter(Boolean).join(' ') || null,
      submissionNumber: input.submissionNumber,
      submittedAt: new Date().toISOString(),
      actorLabel: toActorLabel(input.actorType),
      answers: input.visibleQuestions.map((item) => ({
        sectionTitle: item.sectionTitle,
        questionLabel: item.question.label,
        value: formatAnswerValue(item.question, input.answers[item.question.key], assetLookup),
      })),
    });

    const upload = await uploadFile(
      {
        originalname: packet.fileName,
        mimetype: 'application/pdf',
        size: packet.buffer.length,
        buffer: packet.buffer,
      } as Express.Multer.File,
      `case-form-responses/${input.assignment.case_id}`
    );

    return {
      packetUpload: upload,
      packetOriginalFileName: packet.fileName,
    };
  }

  private applyMappings(
    visibleQuestions: FlattenedQuestion[],
    answers: Record<string, unknown>
  ): {
    contactPatch: Record<string, unknown>;
    caseJsonUpdates: Array<{ container: 'intake_data' | 'custom_data'; key: string; value: unknown }>;
    audit: CaseFormSubmission['mapping_audit'];
  } {
    const contactPatch: Record<string, unknown> = {};
    const caseJsonUpdates: Array<{ container: 'intake_data' | 'custom_data'; key: string; value: unknown }> = [];
    const audit: CaseFormSubmission['mapping_audit'] = [];

    for (const item of visibleQuestions) {
      const target = item.question.mapping_target;
      const value = answers[item.question.key];
      if (!target) {
        continue;
      }

      if (isEmptyValue(value)) {
        audit.push({
          question_key: item.question.key,
          target,
          applied: false,
          reason: 'no_answer',
        });
        continue;
      }

      if (target.entity === 'contact' && target.field) {
        const coerce = CONTACT_FIELD_COERCERS[target.field];
        if (!coerce) {
          audit.push({
            question_key: item.question.key,
            target,
            applied: false,
            reason: 'unsupported_contact_field',
            value,
          });
          continue;
        }

        const normalized = coerce(value);
        if (typeof normalized === 'string' && normalized.trim().length === 0) {
          audit.push({
            question_key: item.question.key,
            target,
            applied: false,
            reason: 'empty_after_normalization',
            value,
          });
          continue;
        }

        contactPatch[target.field] = normalized;
        audit.push({
          question_key: item.question.key,
          target,
          applied: true,
          value: normalized,
        });
        continue;
      }

      if (
        target.entity === 'case' &&
        target.container &&
        target.key &&
        (target.container === 'intake_data' || target.container === 'custom_data')
      ) {
        caseJsonUpdates.push({
          container: target.container,
          key: target.key,
          value,
        });
        audit.push({
          question_key: item.question.key,
          target,
          applied: true,
          value,
        });
        continue;
      }

      audit.push({
        question_key: item.question.key,
        target,
        applied: false,
        reason: 'unsupported_mapping_target',
        value,
      });
    }

    return { contactPatch, caseJsonUpdates, audit };
  }

  private async completeSubmission(
    assignment: CaseFormAssignmentRecord,
    actor: {
      actorType: 'staff' | 'portal' | 'public';
      userId?: string | null;
      portalUserId?: string | null;
      accessTokenId?: string | null;
    },
    payload: SubmitCaseFormDTO
  ): Promise<AssignmentDetailResult> {
    if (TERMINAL_ASSIGNMENT_STATUSES.has(assignment.status) && assignment.status !== 'submitted') {
      throw Object.assign(new Error('This form assignment can no longer accept submissions'), {
        statusCode: 409,
        code: 'assignment_closed',
      });
    }

    const replayId = payload.client_submission_id?.trim() || null;
    if (replayId) {
      const existing = await this.repository.getSubmissionByClientSubmissionId(assignment.id, replayId);
      if (existing) {
        if (stableSerialize(existing.answers) !== stableSerialize(payload.answers)) {
          throw Object.assign(new Error('client_submission_id was already used with a different payload'), {
            statusCode: 409,
            code: 'idempotency_conflict',
          });
        }
        return this.buildAssignmentDetail(assignment);
      }
    }

    const assignmentAssets = await this.repository.listAssetsForAssignment(assignment.id);
    const { normalizedAnswers, visibleQuestions } = validateAnswers(assignment.schema, payload.answers);
    const selectedAssets = this.resolveSelectedAssets(
      visibleQuestions,
      normalizedAnswers,
      assignmentAssets,
      assignment.id
    );
    const anticipatedSubmissionNumber =
      (await this.repository.listSubmissionsForAssignment(assignment.id)).length + 1;

    const artifactDraft = await this.buildSubmissionArtifacts({
      assignment,
      answers: normalizedAnswers,
      visibleQuestions,
      assets: selectedAssets,
      submissionNumber: anticipatedSubmissionNumber,
      actorType: actor.actorType,
    });

    await this.repository.withTransaction(async (client) => {
      const { contactPatch, caseJsonUpdates, audit } = this.applyMappings(visibleQuestions, normalizedAnswers);

      if (Object.keys(contactPatch).length > 0) {
        await this.repository.updateContactFields(client, assignment.contact_id, contactPatch);
      }

      for (const update of caseJsonUpdates) {
        await this.repository.updateCaseJsonField(client, assignment.case_id, update.container, update.key, update.value);
      }

      const responsePacketCaseDocumentId = await this.repository.createCaseDocumentRecord(client, {
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

      const responsePacketContactDocumentId = await this.repository.createContactDocumentRecord(client, {
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

      const nextSubmissionNumber = await this.repository.getNextSubmissionNumber(client, assignment.id);
      const submission = await this.repository.createSubmission(client, {
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

      await this.repository.linkAssetsToSubmission(
        client,
        selectedAssets.map((asset) => asset.id),
        submission.id
      );

      for (const asset of selectedAssets) {
        const visibleQuestion = visibleQuestions.find((item) => item.question.key === asset.question_key);
        const label = visibleQuestion?.question.label || asset.question_key;

        await this.repository.createCaseDocumentRecord(client, {
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

        await this.repository.createContactDocumentRecord(client, {
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

      await this.repository.markAssignmentAfterSubmission(client, assignment.id, normalizedAnswers, actor.userId || null);
      await this.createLifecycleNote(
        client,
        assignment.case_id,
        noteContent('submitted', assignment.title, `Submission #${nextSubmissionNumber} recorded.`),
        actor.userId || null
      );

      if (actor.accessTokenId) {
        await this.repository.markAccessTokenUsed(client, actor.accessTokenId, submission.id);
      }
    });

    const refreshed = await this.repository.getAssignmentById(assignment.id);
    if (!refreshed) {
      throw Object.assign(new Error('Form assignment not found after submission'), {
        statusCode: 404,
        code: 'not_found',
      });
    }
    return this.buildAssignmentDetail(refreshed);
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
    const assignment = await this.repository.withTransaction((client) =>
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
    return assignment;
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
    const assignment = await this.getCaseAssignment(caseId, assignmentId, organizationId);
    return this.buildAssignmentDetail(assignment, {
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
    await this.getCaseAssignment(caseId, assignmentId, organizationId);
    return this.repository.withTransaction((client) =>
      this.repository.updateAssignment(client, assignmentId, {
        title: payload.title,
        description: payload.description,
        schema: payload.schema,
        dueAt: payload.due_at,
        recipientEmail: payload.recipient_email,
        status: payload.status,
        userId: userId || null,
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
    const assignment = await this.getCaseAssignment(caseId, assignmentId, organizationId);
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
    const assignment = await this.getCaseAssignment(caseId, assignmentId, organizationId);
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
    const assignment = await this.getCaseAssignment(caseId, assignmentId, organizationId);
    return this.completeSubmission(assignment, { actorType: 'staff', userId: userId || null }, payload);
  }

  async sendAssignment(
    caseId: string,
    assignmentId: string,
    payload: SendCaseFormAssignmentDTO,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> {
    const assignment = await this.getCaseAssignment(caseId, assignmentId, organizationId);
    if (assignment.status === 'closed' || assignment.status === 'cancelled') {
      throw Object.assign(new Error('This form assignment can no longer be sent'), {
        statusCode: 409,
        code: 'assignment_closed',
      });
    }

    const rawToken = crypto.randomBytes(24).toString('base64url');
    const tokenHash = hashData(rawToken);
    const recipientEmail = payload.recipient_email?.trim() || assignment.recipient_email || null;
    const expiresAt = resolveExpiryDate(assignment, payload.expires_in_days);

    await this.repository.withTransaction(async (client) => {
      await this.repository.revokeAccessTokens(client, assignment.id);
      await this.repository.createAccessToken(client, {
        assignmentId: assignment.id,
        caseId: assignment.case_id,
        contactId: assignment.contact_id,
        recipientEmail,
        tokenHash,
        expiresAt,
        userId: userId || null,
      });
      await this.repository.updateAssignment(client, assignment.id, {
        recipientEmail,
        status: 'sent',
        userId: userId || null,
      });
      await client.query(
        `UPDATE case_form_assignments
         SET sent_at = NOW(),
             updated_at = NOW(),
             updated_by = $2
         WHERE id = $1`,
        [assignment.id, userId || null]
      );
      await this.createLifecycleNote(
        client,
        assignment.case_id,
        noteContent('sent', assignment.title, recipientEmail ? `Recipient: ${recipientEmail}.` : null),
        userId || null
      );
    });

    if (payload.send_email !== false && recipientEmail) {
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
      access_link_url: buildAccessLinkUrl(rawToken),
    };
  }

  async reviewAssignment(
    caseId: string,
    assignmentId: string,
    payload: CaseFormReviewDecision,
    userId?: string,
    organizationId?: string
  ): Promise<CaseFormAssignment> {
    const assignment = await this.getCaseAssignment(caseId, assignmentId, organizationId);
    await this.repository.withTransaction(async (client) => {
      await this.repository.markAssignmentReviewDecision(client, assignment.id, {
        status: payload.decision,
        userId: userId || null,
      });
      await this.createLifecycleNote(
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
    const assignment = await this.getCaseAssignment(caseId, assignmentId, organizationId);
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

  async getAssignmentDetailForPortal(input: ScopedPortalActor, assignmentId: string): Promise<AssignmentDetailResult> {
    const assignment = await this.getPortalAssignment(input, assignmentId);
    await this.repository.withTransaction(async (client) => {
      await this.repository.markAssignmentViewed(client, assignment.id);
    });
    const refreshed = await this.getPortalAssignment(input, assignmentId);
    return this.buildAssignmentDetail(refreshed, {
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
    const assignment = await this.getPortalAssignment(input, assignmentId);
    if (TERMINAL_ASSIGNMENT_STATUSES.has(assignment.status)) {
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
    const assignment = await this.getPortalAssignment(input, assignmentId);
    if (TERMINAL_ASSIGNMENT_STATUSES.has(assignment.status)) {
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

  async submitForPortal(input: ScopedPortalActor, assignmentId: string, payload: SubmitCaseFormDTO): Promise<AssignmentDetailResult> {
    const assignment = await this.getPortalAssignment(input, assignmentId);
    return this.completeSubmission(
      assignment,
      { actorType: 'portal', portalUserId: input.portalUserId || null },
      payload
    );
  }

  async getResponsePacketForPortal(input: ScopedPortalActor, assignmentId: string): Promise<DownloadableFile> {
    const assignment = await this.getPortalAssignment(input, assignmentId);
    const detail = await this.buildAssignmentDetail(assignment);
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
    const access = await this.getPublicAccess(rawToken);
    await this.repository.withTransaction(async (client) => {
      await this.repository.markAssignmentViewed(client, access.token.assignment.id);
      await this.repository.markAccessTokenViewed(client, access.token.id);
    });
    const assignment = await this.repository.getAssignmentById(access.token.assignment.id);
    if (!assignment) {
      throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
    }
    return this.buildAssignmentDetail(assignment, {
      responsePacketDownloadUrl: `/api/v2/public/case-forms/${rawToken}/response-packet`,
      buildAssetDownloadUrl: null,
    });
  }

  async uploadAssetByToken(
    rawToken: string,
    payload: { question_key: string; asset_kind: 'upload' | 'signature' },
    file: Express.Multer.File
  ): Promise<CaseFormAsset> {
    const access = await this.getPublicAccess(rawToken);
    const assignment = access.token.assignment;
    if (TERMINAL_ASSIGNMENT_STATUSES.has(assignment.status)) {
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
    const access = await this.getPublicAccess(rawToken);
    const assignment = access.token.assignment;
    if (TERMINAL_ASSIGNMENT_STATUSES.has(assignment.status)) {
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
    const access = await this.getPublicAccess(rawToken);
    return this.completeSubmission(
      access.token.assignment,
      { actorType: 'public', accessTokenId: access.token.id },
      payload
    );
  }

  async getResponsePacketByToken(rawToken: string): Promise<DownloadableFile> {
    const access = await this.getPublicAccess(rawToken);
    const detail = await this.buildAssignmentDetail(access.token.assignment);
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
