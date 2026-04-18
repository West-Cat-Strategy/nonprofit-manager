import type {
  CaseFormAsset,
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
