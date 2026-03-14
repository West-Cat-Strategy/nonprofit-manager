import { Contact } from '@app-types/contact';
import { logger } from '@config/logger';
import { decrypt } from '@utils/encryption';

export type QueryValue = string | number | boolean | null | string[] | Date;
export type ViewerRole = string | undefined;
export type ContactRecord = Omit<Contact, 'birth_date' | 'phn'> & {
  birth_date?: string | Date | null;
  phn?: string | null;
  phn_encrypted?: string | null;
  total_count?: number | string;
};

const PHN_FULL_ACCESS_ROLES = new Set(['admin', 'manager', 'staff']);

export const CONTACT_SEARCH_SQL =
  `coalesce(nullif(c.first_name, ''), '')`
  + ` || CASE WHEN nullif(c.preferred_name, '') IS NOT NULL THEN ' ' || c.preferred_name ELSE '' END`
  + ` || CASE WHEN nullif(c.last_name, '') IS NOT NULL THEN ' ' || c.last_name ELSE '' END`
  + ` || CASE WHEN nullif(c.email, '') IS NOT NULL THEN ' ' || c.email ELSE '' END`
  + ` || CASE WHEN nullif(c.phone, '') IS NOT NULL THEN ' ' || c.phone ELSE '' END`
  + ` || CASE WHEN nullif(c.mobile_phone, '') IS NOT NULL THEN ' ' || c.mobile_phone ELSE '' END`;

export const normalizePhn = (phn: unknown): string | null | undefined => {
  if (phn === undefined) {
    return undefined;
  }
  if (phn === null) {
    return null;
  }
  if (typeof phn !== 'string') {
    throw new Error('PHN must be a string');
  }

  const digits = phn.replace(/\D/g, '');
  if (digits.length === 0) {
    return null;
  }
  if (digits.length !== 10) {
    throw new Error('PHN must contain exactly 10 digits');
  }

  return digits;
};

const decryptPhn = (phnEncrypted: string | null | undefined, contactId?: string): string | null => {
  if (!phnEncrypted) {
    return null;
  }

  try {
    return decrypt(phnEncrypted);
  } catch (error) {
    logger.warn('Failed to decrypt contact PHN; returning null', {
      contactId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const formatPhnForViewer = (phn: string | null, viewerRole: ViewerRole): string | null => {
  if (!phn) {
    return null;
  }
  if (viewerRole && PHN_FULL_ACCESS_ROLES.has(viewerRole)) {
    return phn;
  }

  return `******${phn.slice(-4)}`;
};

export const normalizeNullableText = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('Expected string value');
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeDateOnly = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = `${value.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${value.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const directMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (directMatch) {
      return directMatch[1];
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
      const day = `${parsed.getUTCDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  throw new Error('Birth date must be a valid YYYY-MM-DD value');
};

export const mapContactRow = (row: ContactRecord, viewerRole?: ViewerRole): Contact => {
  const decryptedPhn = decryptPhn(row.phn_encrypted, row.contact_id);
  const phn = formatPhnForViewer(decryptedPhn, viewerRole);
  const rest = { ...row };
  delete rest.phn_encrypted;

  return {
    ...rest,
    birth_date: normalizeDateOnly(rest.birth_date),
    phn,
  };
};
