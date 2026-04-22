import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormDeliveryTarget,
  CaseFormAssignmentStatus,
  CaseFormLogicRule,
  CaseFormQuestion,
  CaseFormSchema,
  CaseFormSubmission,
} from '@app-types/caseForms';
import { CASE_FORM_ASSIGNMENT_STATUS_BUCKETS } from '@app-types/caseForms';
import type {
  CaseFormAccessTokenRecord,
  CaseFormAssignmentRecord,
} from '../repositories/caseFormsRepository';

export interface ScopedPortalActor {
  contactId: string;
  portalUserId?: string | null;
}

export interface ScopedPublicActor {
  token: CaseFormAccessTokenRecord;
}

export interface AssignmentDetailResult {
  assignment: CaseFormAssignment;
  submissions: CaseFormSubmission[];
}

export interface DownloadableFile {
  fileName: string;
  filePath: string;
  mimeType: string;
}

export interface FlattenedQuestion {
  sectionTitle: string;
  question: CaseFormQuestion;
}

export const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
export const TERMINAL_ASSIGNMENT_STATUSES = new Set<CaseFormAssignmentStatus>(
  CASE_FORM_ASSIGNMENT_STATUS_BUCKETS.completed
);

export const resolvePortalAssignmentStatuses = (status?: string): string[] | null => {
  if (!status) {
    return null;
  }

  if (status === 'active' || status === 'completed') {
    return CASE_FORM_ASSIGNMENT_STATUS_BUCKETS[status];
  }

  return [status];
};

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

export const stableSerialize = (value: unknown): string => {
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

export const isEmptyValue = (value: unknown): boolean => {
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

export const isQuestionVisible = (
  question: CaseFormQuestion,
  answers: Record<string, unknown>
): boolean => {
  if (!question.visible_when || question.visible_when.length === 0) {
    return true;
  }
  return question.visible_when.every((rule) => ruleMatches(rule, answers));
};

export const extractAssetIds = (value: unknown): string[] => {
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

export const validateAnswers = (
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

export const formatAnswerValue = (
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

export const toActorLabel = (actorType: 'staff' | 'portal' | 'public'): string => {
  if (actorType === 'portal') return 'Portal client';
  if (actorType === 'public') return 'Secure email link';
  return 'Staff';
};

export const includesPortalDelivery = (
  deliveryTarget?: CaseFormDeliveryTarget | null
): boolean => deliveryTarget === 'portal' || deliveryTarget === 'portal_and_email';

export const includesEmailDelivery = (
  deliveryTarget?: CaseFormDeliveryTarget | null
): boolean => deliveryTarget === 'email' || deliveryTarget === 'portal_and_email';

export const formatDeliveryTargetLabel = (deliveryTarget: CaseFormDeliveryTarget): string => {
  if (deliveryTarget === 'portal') {
    return 'portal';
  }
  if (deliveryTarget === 'email') {
    return 'email';
  }
  return 'portal and email';
};

const toLocalDateString = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const resolveNextBusinessDate = (from = new Date()): string => {
  const candidate = new Date(from);
  candidate.setHours(12, 0, 0, 0);

  do {
    candidate.setDate(candidate.getDate() + 1);
  } while (candidate.getDay() === 0 || candidate.getDay() === 6);

  return toLocalDateString(candidate);
};

export const buildReviewFollowUpTitle = (assignmentTitle: string): string =>
  `Review submitted form: ${assignmentTitle}`;

export const buildReviewFollowUpDescription = (
  assignmentTitle: string,
  submissionNumber: number
): string =>
  `Submission #${submissionNumber} for "${assignmentTitle}" was received. Review the mapped updates, packet, and attachments on the client file.`;

export const buildReviewFollowUpResolutionNote = (
  decision: 'reviewed' | 'closed' | 'cancelled',
  assignmentTitle: string,
  reviewerNotes?: string | null
): string => {
  const prefix =
    decision === 'cancelled'
      ? `Form review cancelled for "${assignmentTitle}".`
      : `Form review ${decision} for "${assignmentTitle}".`;
  const trimmedNotes = reviewerNotes?.trim();
  return trimmedNotes ? `${prefix}\n\nReviewer note: ${trimmedNotes}` : prefix;
};

export const buildAccessLinkUrl = (rawToken: string): string =>
  `${FRONTEND_URL}/public/case-forms/${rawToken}`;

export const resolveDraftStatus = (
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

export const resolveExpiryDate = (
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

export const noteContent = (action: string, assignmentTitle: string, detail?: string | null): string =>
  detail ? `Case form ${action}: ${assignmentTitle}. ${detail}` : `Case form ${action}: ${assignmentTitle}.`;

export const applyMappings = (
  visibleQuestions: FlattenedQuestion[],
  answers: Record<string, unknown>
): {
  contactPatch: Record<string, unknown>;
  caseJsonUpdates: Array<{ container: 'intake_data' | 'custom_data'; key: string; value: unknown }>;
  audit: CaseFormSubmission['mapping_audit'];
} => {
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
};

export const resolveSelectedAssets = (
  visibleQuestions: FlattenedQuestion[],
  answers: Record<string, unknown>,
  assignmentAssets: CaseFormAsset[],
  assignmentId: string
): CaseFormAsset[] => {
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
};

export const buildSubmissionArtifacts = async (input: {
  assignment: CaseFormAssignmentRecord;
  answers: Record<string, unknown>;
  visibleQuestions: FlattenedQuestion[];
  assets: CaseFormAsset[];
  submissionNumber: number;
  actorType: 'staff' | 'portal' | 'public';
  generatePacket: (params: {
    assignmentTitle: string;
    assignmentDescription: string | null;
    caseNumber: string | null;
    caseTitle: string | null;
    contactName: string | null;
    submissionNumber: number;
    submittedAt: string;
    actorLabel: string;
    answers: Array<{ sectionTitle: string; questionLabel: string; value: string }>;
  }) => Promise<{ fileName: string; buffer: Buffer }>;
  uploadGeneratedFile: (file: Express.Multer.File, directory: string) => Promise<{
    fileName: string;
    filePath: string;
    fileSize: number;
  }>;
}): Promise<{
  packetUpload: {
    fileName: string;
    filePath: string;
    fileSize: number;
  };
  packetOriginalFileName: string;
}> => {
  const assetLookup = new Map(input.assets.map((asset) => [asset.id, asset]));
  const packet = await input.generatePacket({
    assignmentTitle: input.assignment.title,
    assignmentDescription: input.assignment.description ?? null,
    caseNumber: input.assignment.case_number ?? null,
    caseTitle: input.assignment.case_title ?? null,
    contactName:
      [input.assignment.contact_first_name, input.assignment.contact_last_name].filter(Boolean).join(' ') || null,
    submissionNumber: input.submissionNumber,
    submittedAt: new Date().toISOString(),
    actorLabel: toActorLabel(input.actorType),
    answers: input.visibleQuestions.map((item) => ({
      sectionTitle: item.sectionTitle,
      questionLabel: item.question.label,
      value: formatAnswerValue(item.question, input.answers[item.question.key], assetLookup),
    })),
  });

  const upload = await input.uploadGeneratedFile(
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
};
