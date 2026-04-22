import { toDateInputValue } from '../../../../utils/format';
import { isUuid } from '../../../../utils/uuid';
import type { ContactMutationPayload } from '../../types/contracts';
import type { ContactFormValues } from './types';

type ContactFormMode = 'create' | 'edit';

const isMaskedPhn = (value: string): boolean => /^\*{2,}\d{4}$/.test(value.trim());

const normalizeOptionalField = (value: string | null | undefined, mode: ContactFormMode) => {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (!trimmed) {
    return mode === 'edit' ? null : undefined;
  }
  return trimmed;
};

const normalizeAccountId = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return isUuid(trimmed) ? trimmed : undefined;
};

export const buildContactMutationPayload = (
  formData: ContactFormValues,
  mode: ContactFormMode
): ContactMutationPayload => {
  const cleanedTags = (formData.tags || [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  const rawPhn = (formData.phn || '').trim();
  let normalizedPhn: string | null | undefined;
  if (rawPhn.length === 0) {
    normalizedPhn = mode === 'edit' ? null : undefined;
  } else if (isMaskedPhn(rawPhn)) {
    normalizedPhn = undefined;
  } else {
    normalizedPhn = rawPhn.replace(/\D/g, '');
  }

  const normalizedAccountId = normalizeAccountId(formData.account_id);
  const baseFormData = { ...formData };
  delete baseFormData.account_id;

  return {
    ...baseFormData,
    ...(normalizedAccountId ? { account_id: normalizedAccountId } : {}),
    preferred_name: formData.preferred_name || undefined,
    middle_name: formData.middle_name || undefined,
    salutation: formData.salutation || undefined,
    suffix: formData.suffix || undefined,
    birth_date: formData.birth_date ? toDateInputValue(formData.birth_date) : (mode === 'edit' ? null : undefined),
    gender: formData.gender || undefined,
    pronouns: formData.pronouns || undefined,
    phn: normalizedPhn,
    email: normalizeOptionalField(formData.email, mode),
    phone: normalizeOptionalField(formData.phone, mode),
    mobile_phone: normalizeOptionalField(formData.mobile_phone, mode),
    job_title: formData.job_title || undefined,
    department: formData.department || undefined,
    address_line1: formData.no_fixed_address ? undefined : (formData.address_line1 || undefined),
    address_line2: formData.no_fixed_address ? undefined : (formData.address_line2 || undefined),
    city: formData.no_fixed_address ? undefined : (formData.city || undefined),
    state_province: formData.no_fixed_address ? undefined : (formData.state_province || undefined),
    postal_code: formData.no_fixed_address ? undefined : (formData.postal_code || undefined),
    country: formData.no_fixed_address ? undefined : (formData.country || undefined),
    no_fixed_address: formData.no_fixed_address || false,
    preferred_contact_method: formData.preferred_contact_method || undefined,
    notes: formData.notes || undefined,
    tags: cleanedTags,
    roles: formData.roles || [],
  };
};
