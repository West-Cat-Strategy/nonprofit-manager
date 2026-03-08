import { Pool } from 'pg';
import { logger } from '@config/logger';
import { decrypt, encrypt } from '@utils/encryption';

export const PROFILE_COLUMNS = `
  c.id as contact_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.mobile_phone,
  c.address_line1,
  c.address_line2,
  c.city,
  c.state_province,
  c.postal_code,
  c.country,
  c.preferred_contact_method,
  c.pronouns,
  c.gender,
  c.phn_encrypted,
  c.profile_picture
`;

export const PORTAL_EVENT_COLUMNS = `
  e.id,
  e.name,
  e.description,
  e.event_type,
  e.status,
  e.is_public,
  e.is_recurring,
  e.recurrence_pattern,
  e.recurrence_interval,
  e.recurrence_end_date,
  e.start_date,
  e.end_date,
  e.location_name,
  e.address_line1,
  e.address_line2,
  e.city,
  e.state_province,
  e.postal_code,
  e.country,
  e.capacity,
  e.registered_count,
  e.attended_count,
  e.created_at,
  e.updated_at,
  e.created_by,
  e.modified_by,
  e.public_checkin_enabled,
  e.public_checkin_pin_rotated_at
`;

export type PortalListOrder = 'asc' | 'desc';

export type PortalOffsetPage = {
  limit: number;
  offset: number;
  has_more: boolean;
  total: number;
};

export type PortalPagedResult<T> = {
  items: T[];
  page: PortalOffsetPage;
};

export class PortalRepositorySupport {
  private readonly defaultTimelineLimit = 50;
  private readonly maxTimelineLimit = 200;
  private readonly defaultOffsetLimit = 20;
  private readonly maxOffsetLimit = 100;

  normalizePhn(phn: unknown): string | null {
    if (phn === null || phn === undefined) {
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
  }

  encryptPhn(phn: string | null): string | null {
    return phn ? encrypt(phn) : null;
  }

  decryptPhn(phnEncrypted: unknown, contactId: unknown): string | null {
    if (typeof phnEncrypted !== 'string' || phnEncrypted.length === 0) {
      return null;
    }

    try {
      return decrypt(phnEncrypted);
    } catch (error) {
      logger.warn('Failed to decrypt portal profile PHN; returning null', {
        contactId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  mapProfileRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!row) {
      return null;
    }

    const phn = this.decryptPhn(row.phn_encrypted, row.contact_id);
    const rest = { ...row };
    delete rest.phn_encrypted;

    return {
      ...rest,
      phn,
    };
  }

  normalizeOffsetPage(query?: { limit?: number; offset?: number }): {
    limit: number;
    offset: number;
  } {
    const requestedLimit = query?.limit ?? this.defaultOffsetLimit;
    const limit = Math.max(1, Math.min(requestedLimit, this.maxOffsetLimit));
    const requestedOffset = query?.offset ?? 0;
    const offset = Math.max(0, requestedOffset);
    return { limit, offset };
  }

  normalizeSearch(search?: string): string | null {
    const normalized = search?.trim();
    if (!normalized) {
      return null;
    }
    return normalized;
  }

  buildOffsetPage(limit: number, offset: number, total: number): PortalOffsetPage {
    return {
      limit,
      offset,
      has_more: offset + limit < total,
      total,
    };
  }

  decodeTimelineCursor(cursor?: string): { createdAt: string; id: string } | null {
    if (!cursor) {
      return null;
    }

    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as { createdAt?: string; id?: string };
      if (!parsed.createdAt || !parsed.id) {
        return null;
      }

      const createdAtTime = Date.parse(parsed.createdAt);
      if (Number.isNaN(createdAtTime)) {
        return null;
      }

      return {
        createdAt: new Date(createdAtTime).toISOString(),
        id: parsed.id,
      };
    } catch {
      return null;
    }
  }

  encodeTimelineCursor(row: { id: string; created_at: Date | string }): string {
    const createdAtIso =
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString();
    return Buffer.from(JSON.stringify({ createdAt: createdAtIso, id: row.id }), 'utf8').toString(
      'base64url'
    );
  }

  get timelineDefaults(): { defaultLimit: number; maxLimit: number } {
    return {
      defaultLimit: this.defaultTimelineLimit,
      maxLimit: this.maxTimelineLimit,
    };
  }
}

export type QueryClient = Pool;
