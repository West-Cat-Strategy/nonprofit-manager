import type {
  CaseFormAsset,
  CaseFormDeliveryChannel,
  CaseFormDeliveryTarget,
  CaseFormAssignmentDetail,
  CaseFormMappingTarget,
  CaseFormQuestion,
  CaseFormQuestionType,
  CaseFormSchema,
} from '../../../types/caseForms';

export const DEFAULT_SINGLE_CHECKBOX_TEXT = 'I agree';

export const CONTACT_MAPPING_FIELDS = [
  'first_name',
  'preferred_name',
  'last_name',
  'middle_name',
  'salutation',
  'suffix',
  'email',
  'phone',
  'mobile_phone',
  'birth_date',
  'gender',
  'pronouns',
  'address_line1',
  'address_line2',
  'city',
  'state_province',
  'postal_code',
  'country',
  'job_title',
  'department',
  'preferred_contact_method',
  'no_fixed_address',
  'do_not_email',
  'do_not_phone',
  'do_not_sms',
  'do_not_voicemail',
];

const OPTION_BACKED_QUESTION_TYPES: CaseFormQuestionType[] = ['select', 'radio'];
const UPLOAD_QUESTION_TYPES: CaseFormQuestionType[] = ['file', 'signature'];
const MIME_TYPE_PATTERN = /^[a-z0-9!#$&^_.+-]+\/(?:[a-z0-9!#$&^_.+-]+|\*)$/i;

export interface CaseFormAuthoringDiagnostic {
  id: string;
  questionId?: string;
  message: string;
}

export const createId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `cf_${Math.random().toString(36).slice(2, 10)}`;

export function getDefaultPlaceholderForQuestionType(
  type: CaseFormQuestionType,
  multiple?: boolean
): string {
  return type === 'checkbox' && !multiple ? DEFAULT_SINGLE_CHECKBOX_TEXT : '';
}

export const createQuestion = (
  index: number,
  type: CaseFormQuestionType = 'text'
): CaseFormQuestion => ({
  id: createId(),
  key: `question_${index}`,
  type,
  label: `Question ${index}`,
  helper_text: '',
  placeholder: getDefaultPlaceholderForQuestionType(type),
  required: false,
  mapping_target: null,
});

export const getQuestionPlaceholderLabel = (
  question: Pick<CaseFormQuestion, 'type' | 'multiple'>
): string => (question.type === 'checkbox' && !question.multiple ? 'Checkbox Text' : 'Placeholder');

export const createBlankSchema = (title: string): CaseFormSchema => ({
  version: 1,
  title,
  description: '',
  sections: [
    {
      id: createId(),
      title: 'Section 1',
      description: '',
      questions: [createQuestion(1)],
    },
  ],
});

export const parseOptionsText = (value: string): Array<{ label: string; value: string }> =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, rawValue] = line.split('|').map((part) => part.trim());
      return {
        label,
        value: rawValue || label,
      };
    });

export const formatOptionsText = (options?: Array<{ label: string; value: string }>): string =>
  (options || []).map((option) => `${option.label}|${option.value}`).join('\n');

export const formatLogicRulesText = (question: CaseFormQuestion): string =>
  question.visible_when?.length ? JSON.stringify(question.visible_when, null, 2) : '';

export const parseLogicRulesText = (value: string): CaseFormQuestion['visible_when'] => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const parseLogicDraftForDiagnostics = (
  value: string
): { rules?: CaseFormQuestion['visible_when']; invalid?: boolean } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? { rules: parsed } : { invalid: true };
  } catch {
    return { invalid: true };
  }
};

export const collectCaseFormAuthoringDiagnostics = (
  schema: CaseFormSchema,
  logicDrafts: Record<string, string> = {}
): CaseFormAuthoringDiagnostic[] => {
  const diagnostics: CaseFormAuthoringDiagnostic[] = [];
  const questions = schema.sections.flatMap((section) => section.questions);
  const keyCounts = new Map<string, number>();

  questions.forEach((question) => {
    const key = question.key.trim();
    if (key) {
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    }
  });

  const knownKeys = new Set(Array.from(keyCounts.keys()));

  questions.forEach((question) => {
    const label = question.label.trim() || question.key.trim() || 'Untitled question';
    const key = question.key.trim();
    const pushDiagnostic = (id: string, message: string): void => {
      diagnostics.push({
        id: `${question.id}:${id}`,
        questionId: question.id,
        message: `${label}: ${message}`,
      });
    };

    if (!key) {
      pushDiagnostic('blank-key', 'add a question key before saving.');
    } else if ((keyCounts.get(key) || 0) > 1) {
      pushDiagnostic('duplicate-key', `question key "${key}" is used more than once.`);
    }

    const requiresOptions =
      OPTION_BACKED_QUESTION_TYPES.includes(question.type) ||
      (question.type === 'checkbox' && question.multiple === true);
    if (requiresOptions) {
      const hasOption = question.options?.some(
        (option) => option.label.trim().length > 0 && option.value.trim().length > 0
      );
      if (!hasOption) {
        pushDiagnostic('missing-options', 'add at least one option with a label and value.');
      }
    }

    if (UPLOAD_QUESTION_TYPES.includes(question.type)) {
      const acceptedTypes = question.upload_config?.accept || [];
      if (acceptedTypes.length === 0) {
        pushDiagnostic('missing-mime-types', 'add accepted MIME types for uploads.');
      }

      acceptedTypes
        .map((mimeType) => mimeType.trim())
        .filter(Boolean)
        .forEach((mimeType) => {
          if (!MIME_TYPE_PATTERN.test(mimeType)) {
            pushDiagnostic('invalid-mime-type', `"${mimeType}" is not a valid MIME type.`);
          }
        });
    }

    if (question.mapping_target?.entity === 'contact') {
      if (!question.mapping_target.field?.trim()) {
        pushDiagnostic('blank-contact-mapping', 'choose a contact field or remove the mapping.');
      }
    }

    if (question.mapping_target?.entity === 'case') {
      if (!question.mapping_target.key?.trim()) {
        pushDiagnostic('blank-case-mapping', 'add a case JSON key or remove the mapping.');
      }
    }

    const logicDraft = logicDrafts[question.id] ?? formatLogicRulesText(question);
    const { rules, invalid } = parseLogicDraftForDiagnostics(logicDraft);
    if (invalid) {
      pushDiagnostic('invalid-conditional-json', 'fix conditional visibility JSON.');
      return;
    }

    rules?.forEach((rule, index) => {
      const referencedKey =
        rule && typeof rule === 'object' && typeof rule.question_key === 'string'
          ? rule.question_key.trim()
          : '';
      if (!referencedKey) {
        pushDiagnostic(`missing-reference-${index}`, 'conditional rule needs a question_key.');
      } else if (!knownKeys.has(referencedKey)) {
        pushDiagnostic(
          `unknown-reference-${index}`,
          `conditional rule references missing question key "${referencedKey}".`
        );
      }
    });
  });

  return diagnostics;
};

export const updateQuestionMappingTarget = (
  current: CaseFormMappingTarget | null | undefined,
  patch: Partial<CaseFormMappingTarget>,
  mode?: 'none' | 'contact' | 'case'
): CaseFormMappingTarget | null => {
  if (mode === 'none') {
    return null;
  }

  const base: CaseFormMappingTarget =
    mode === 'contact'
      ? { entity: 'contact', field: '' }
      : mode === 'case'
        ? { entity: 'case', container: 'intake_data', key: '' }
        : current || { entity: 'contact', field: '' };

  return {
    ...base,
    ...patch,
  };
};

export const collectAssets = (detail: CaseFormAssignmentDetail | null): CaseFormAsset[] => {
  if (!detail) return [];
  const submissionAssets = detail.submissions.flatMap((submission) => [
    ...submission.asset_refs,
    ...submission.signature_refs,
  ]);
  return [...(detail.assignment.draft_assets || []), ...submissionAssets];
};

export const resolveDeliveryTarget = (
  deliveryTarget?: CaseFormDeliveryTarget | null,
  recipientEmail?: string | null
): CaseFormDeliveryTarget => {
  if (deliveryTarget) {
    return deliveryTarget;
  }
  return recipientEmail ? 'email' : 'portal';
};

export const usesEmailDelivery = (deliveryTarget: CaseFormDeliveryTarget): boolean =>
  deliveryTarget === 'email' || deliveryTarget === 'portal_and_email';

export const resolveDeliveryChannels = (
  deliveryChannels?: CaseFormDeliveryChannel[] | null,
  deliveryTarget?: CaseFormDeliveryTarget | null,
  recipientEmail?: string | null
): CaseFormDeliveryChannel[] => {
  if (deliveryChannels?.length) {
    return Array.from(new Set(deliveryChannels));
  }
  if (deliveryTarget === 'portal_and_email') {
    return ['portal', 'email'];
  }
  if (deliveryTarget === 'portal' || deliveryTarget === 'email') {
    return [deliveryTarget];
  }
  return recipientEmail ? ['email'] : ['portal'];
};

export const usesChannel = (
  deliveryChannels: CaseFormDeliveryChannel[],
  channel: CaseFormDeliveryChannel
): boolean => deliveryChannels.includes(channel);

export const sendLabelForChannels = (deliveryChannels: CaseFormDeliveryChannel[]): string => {
  const labels = deliveryChannels.map((channel) => (channel === 'sms' ? 'SMS' : channel));
  return labels.length ? `Open Form: ${labels.join(' + ')}` : 'Open Form';
};

export const successMessageForChannels = (deliveryChannels: CaseFormDeliveryChannel[]): string => {
  const hasPortal = deliveryChannels.includes('portal');
  const hasEmail = deliveryChannels.includes('email');
  const hasSms = deliveryChannels.includes('sms');
  if (hasPortal && !hasEmail && !hasSms) {
    return 'Form opened in the client portal';
  }
  if (!hasPortal && hasEmail && !hasSms) {
    return 'Secure form email sent';
  }
  if (!hasPortal && !hasEmail && hasSms) {
    return 'Secure form SMS sent';
  }
  return 'Form opened with the selected delivery channels';
};

export const sendLabelForTarget = (deliveryTarget: CaseFormDeliveryTarget): string => {
  if (deliveryTarget === 'portal') {
    return 'Send to Portal';
  }
  if (deliveryTarget === 'email') {
    return 'Send by Email';
  }
  return 'Send to Portal + Email';
};

export const successMessageForTarget = (deliveryTarget: CaseFormDeliveryTarget): string => {
  if (deliveryTarget === 'portal') {
    return 'Form delivered to the portal';
  }
  if (deliveryTarget === 'email') {
    return 'Secure form email sent';
  }
  return 'Form delivered to the portal and sent by email';
};
