import type {
  PublicActionSubmissionRequest,
  PublicActionType,
} from '@app-types/websiteBuilder';

export interface PublicActionSubmissionSideEffects {
  contactId?: string;
  pledgeId?: string;
  supportLetterId?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

export const ACTION_TYPES_REQUIRING_MANUAL_REVIEW = new Set<PublicActionType>([
  'self_referral',
  'support_letter_request',
]);

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const parsePositiveAmount = (value: unknown): number | null => {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : null;
};

export const buildSubmissionPayload = (
  payloadRedacted: Record<string, unknown>
): PublicActionSubmissionRequest => ({
  first_name: asOptionalString(payloadRedacted.first_name),
  last_name: asOptionalString(payloadRedacted.last_name),
  email: asOptionalString(payloadRedacted.email),
  phone: asOptionalString(payloadRedacted.phone),
  amount: parsePositiveAmount(payloadRedacted.amount) ?? undefined,
  message: asOptionalString(payloadRedacted.message),
  purpose: asOptionalString(payloadRedacted.purpose),
  schedule: asOptionalString(payloadRedacted.schedule),
  due_date: asOptionalString(payloadRedacted.due_date),
});
