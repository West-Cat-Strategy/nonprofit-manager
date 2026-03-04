import { Pool } from 'pg';
import { logger } from '@config/logger';
import { decrypt, encrypt } from '@utils/encryption';

const PROFILE_COLUMNS = `
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

const PORTAL_EVENT_COLUMNS = `
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

type PortalListOrder = 'asc' | 'desc';

type PortalOffsetPage = {
  limit: number;
  offset: number;
  has_more: boolean;
  total: number;
};

type PortalPagedResult<T> = {
  items: T[];
  page: PortalOffsetPage;
};

export class PortalRepository {
  private readonly defaultTimelineLimit = 50;
  private readonly maxTimelineLimit = 200;
  private readonly defaultOffsetLimit = 20;
  private readonly maxOffsetLimit = 100;

  constructor(private readonly pool: Pool) {}

  private normalizePhn(phn: unknown): string | null {
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

  private decryptPhn(phnEncrypted: unknown, contactId: unknown): string | null {
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

  private mapProfileRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
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

  private normalizeOffsetPage(query?: { limit?: number; offset?: number }): {
    limit: number;
    offset: number;
  } {
    const requestedLimit = query?.limit ?? this.defaultOffsetLimit;
    const limit = Math.max(1, Math.min(requestedLimit, this.maxOffsetLimit));
    const requestedOffset = query?.offset ?? 0;
    const offset = Math.max(0, requestedOffset);
    return { limit, offset };
  }

  private normalizeSearch(search?: string): string | null {
    const normalized = search?.trim();
    if (!normalized) {
      return null;
    }
    return normalized;
  }

  private buildOffsetPage(limit: number, offset: number, total: number): PortalOffsetPage {
    return {
      limit,
      offset,
      has_more: offset + limit < total,
      total,
    };
  }

  private decodeTimelineCursor(cursor?: string): { createdAt: string; id: string } | null {
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

  private encodeTimelineCursor(row: { id: string; created_at: Date | string }): string {
    const createdAtIso =
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString();
    return Buffer.from(JSON.stringify({ createdAt: createdAtIso, id: row.id }), 'utf8').toString(
      'base64url'
    );
  }

  async getProfile(contactId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT ${PROFILE_COLUMNS}
       FROM contacts c
       WHERE c.id = $1`,
      [contactId]
    );

    return this.mapProfileRow(result.rows[0] ?? null);
  }

  async updateProfile(
    contactId: string,
    updates: Record<string, string | null>
  ): Promise<Record<string, unknown> | null> {
    const normalizedUpdates: Record<string, string | null> = { ...updates };
    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'phn')) {
      const normalizedPhn = this.normalizePhn(normalizedUpdates.phn);
      normalizedUpdates.phn_encrypted = normalizedPhn ? encrypt(normalizedPhn) : null;
      delete normalizedUpdates.phn;
    }

    const fields = Object.keys(normalizedUpdates);
    if (fields.length === 0) {
      return null;
    }

    const assignments: string[] = [];
    const values: Array<string | null> = [];

    fields.forEach((field, idx) => {
      assignments.push(`${field} = $${idx + 1}`);
      values.push(normalizedUpdates[field]);
    });

    values.push(contactId);

    const result = await this.pool.query(
      `UPDATE contacts
       SET ${assignments.join(', ')}, updated_at = NOW(), modified_by = NULL
       WHERE id = $${values.length}
       RETURNING ${PROFILE_COLUMNS}`,
      values
    );

    return this.mapProfileRow(result.rows[0] ?? null);
  }

  async getPortalUserPasswordHash(portalUserId: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT password_hash FROM portal_users WHERE id = $1',
      [portalUserId]
    );

    return result.rows[0]?.password_hash ?? null;
  }

  async updatePortalUserPassword(portalUserId: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE portal_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, portalUserId]
    );
  }

  async syncPortalUserEmail(portalUserId: string, email: string): Promise<void> {
    await this.pool.query('UPDATE portal_users SET email = $1 WHERE id = $2', [
      email.toLowerCase(),
      portalUserId,
    ]);
  }

  async getPortalEvents(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'start_date' | 'name' | 'created_at';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    const { limit, offset } = this.normalizeOffsetPage(query);
    const search = this.normalizeSearch(query?.search);
    const sortColumns: Record<'start_date' | 'name' | 'created_at', string> = {
      start_date: 'e.start_date',
      name: 'LOWER(e.name)',
      created_at: 'e.created_at',
    };
    const sort = query?.sort ?? 'start_date';
    const sortColumn = sortColumns[sort];
    const order = query?.order === 'desc' ? 'DESC' : 'ASC';

    const totalResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM events e
       WHERE e.start_date >= NOW()
         AND e.status NOT IN ('cancelled', 'completed')
         AND (
           e.is_public = true
           OR EXISTS (
             SELECT 1
             FROM event_registrations er
             WHERE er.event_id = e.id
               AND er.contact_id = $1
           )
         )
         AND (
           $2::text IS NULL
           OR concat_ws(' ', e.name, e.description, e.location_name, e.event_type) ILIKE '%' || $2 || '%'
         )`,
      [contactId, search]
    );
    const total = Number(totalResult.rows[0]?.count ?? '0');

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT
         ${PORTAL_EVENT_COLUMNS},
         er.registration_id,
         er.registration_status,
         er.check_in_token,
         er.checked_in,
         er.check_in_time,
         er.check_in_method
       FROM events e
       LEFT JOIN LATERAL (
         SELECT
           reg.id AS registration_id,
           reg.registration_status,
           reg.check_in_token,
           reg.checked_in,
           reg.check_in_time,
           reg.check_in_method
         FROM event_registrations reg
         WHERE reg.event_id = e.id
           AND reg.contact_id = $1
         LIMIT 1
       ) er ON true
       WHERE e.start_date >= NOW()
         AND e.status NOT IN ('cancelled', 'completed')
         AND (
           e.is_public = true
           OR EXISTS (
             SELECT 1
             FROM event_registrations reg_exists
             WHERE reg_exists.event_id = e.id
               AND reg_exists.contact_id = $1
           )
         )
         AND (
           $2::text IS NULL
           OR concat_ws(' ', e.name, e.description, e.location_name, e.event_type) ILIKE '%' || $2 || '%'
         )
       ORDER BY ${sortColumn} ${order}, e.id ${order}
       LIMIT $3 OFFSET $4`,
      [contactId, search, limit, offset]
    );

    return {
      items: result.rows,
      page: this.buildOffsetPage(limit, offset, total),
    };
  }

  async getPortalRelationships(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT
        cr.id,
        cr.relationship_type,
        cr.relationship_label,
        cr.notes,
        cr.is_active,
        cr.created_at,
        c.id as related_contact_id,
        c.first_name as related_contact_first_name,
        c.last_name as related_contact_last_name,
        c.email as related_contact_email,
        c.phone as related_contact_phone
      FROM contact_relationships cr
      LEFT JOIN contacts c ON cr.related_contact_id = c.id
      WHERE cr.contact_id = $1 AND cr.is_active = true
      ORDER BY cr.created_at DESC`,
      [contactId]
    );

    return result.rows;
  }

  async createRelatedContact(input: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO contacts (first_name, last_name, email, phone, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING id`,
      [input.firstName, input.lastName, input.email ?? null, input.phone ?? null, null]
    );
    return result.rows[0].id as string;
  }

  async createPortalRelationship(input: {
    contactId: string;
    relatedContactId: string;
    relationshipType: string;
    relationshipLabel?: string | null;
    notes?: string | null;
  }): Promise<Record<string, unknown>> {
    const result = await this.pool.query(
      `INSERT INTO contact_relationships (
        contact_id, related_contact_id, relationship_type, relationship_label, notes,
        is_bidirectional, inverse_relationship_type, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING id, relationship_type, relationship_label, notes, created_at`,
      [
        input.contactId,
        input.relatedContactId,
        input.relationshipType,
        input.relationshipLabel ?? null,
        input.notes ?? null,
        false,
        null,
        null,
      ]
    );

    return result.rows[0] as Record<string, unknown>;
  }

  async updatePortalRelationship(input: {
    contactId: string;
    relationshipId: string;
    relationshipType?: string;
    relationshipLabel?: string | null;
    notes?: string | null;
  }): Promise<Record<string, unknown> | null> {
    const fields: string[] = [];
    const values: Array<string | null> = [];
    let index = 1;

    if (input.relationshipType) {
      fields.push(`relationship_type = $${index++}`);
      values.push(input.relationshipType);
    }
    if (input.relationshipLabel !== undefined) {
      fields.push(`relationship_label = $${index++}`);
      values.push(input.relationshipLabel ?? null);
    }
    if (input.notes !== undefined) {
      fields.push(`notes = $${index++}`);
      values.push(input.notes ?? null);
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(input.relationshipId, input.contactId);

    const result = await this.pool.query(
      `UPDATE contact_relationships
       SET ${fields.join(', ')}, updated_at = NOW(), modified_by = NULL
       WHERE id = $${index++} AND contact_id = $${index}
       RETURNING id, relationship_type, relationship_label, notes, updated_at`,
      values
    );

    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async deletePortalRelationship(contactId: string, relationshipId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE contact_relationships
       SET is_active = false
       WHERE id = $1 AND contact_id = $2
       RETURNING id`,
      [relationshipId, contactId]
    );

    return result.rows.length > 0;
  }

  async getEventForPortalRegistration(eventId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT id, is_public, start_date, status
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    return result.rows[0] ?? null;
  }

  async getPortalRegistrationByEvent(eventId: string, contactId: string): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT id
       FROM event_registrations
       WHERE event_id = $1 AND contact_id = $2`,
      [eventId, contactId]
    );

    return (result.rows[0]?.id as string | undefined) ?? null;
  }

  async getPortalCases(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `
      SELECT
        c.id,
        c.case_number,
        c.title,
        c.description,
        c.priority,
        c.client_viewable,
        c.updated_at,
        cs.name AS status_name,
        cs.status_type,
        ct.name AS case_type_name
      FROM cases c
      LEFT JOIN case_statuses cs ON cs.id = c.status_id
      LEFT JOIN case_types ct ON ct.id = c.case_type_id
      WHERE c.contact_id = $1
        AND c.client_viewable = true
      ORDER BY c.updated_at DESC, c.created_at DESC
    `,
      [contactId]
    );

    return result.rows;
  }

  async getPortalCaseById(contactId: string, caseId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `
      SELECT
        c.id,
        c.case_number,
        c.title,
        c.description,
        c.priority,
        c.client_viewable,
        c.intake_date,
        c.opened_date,
        c.closed_date,
        c.due_date,
        c.updated_at,
        cs.name AS status_name,
        cs.status_type,
        ct.name AS case_type_name
      FROM cases c
      LEFT JOIN case_statuses cs ON cs.id = c.status_id
      LEFT JOIN case_types ct ON ct.id = c.case_type_id
      WHERE c.id = $1
        AND c.contact_id = $2
        AND c.client_viewable = true
      LIMIT 1
    `,
      [caseId, contactId]
    );

    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async getPortalCaseTimeline(
    contactId: string,
    caseId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ items: unknown[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> {
    const requestedLimit = options?.limit ?? this.defaultTimelineLimit;
    const limit = Math.max(1, Math.min(requestedLimit, this.maxTimelineLimit));
    const cursor = this.decodeTimelineCursor(options?.cursor);
    const pageSize = limit + 1;

    const result = await this.pool.query(
      `
      SELECT
        timeline.id,
        timeline.type,
        timeline.created_at,
        timeline.title,
        timeline.content,
        timeline.metadata
      FROM (
        SELECT
          cn.id,
          'note'::text AS type,
          cn.created_at,
          COALESCE(cn.subject, cn.note_type, 'Note') AS title,
          cn.content,
          jsonb_build_object(
            'note_type', cn.note_type,
            'category', cn.category
          ) AS metadata
        FROM case_notes cn
        JOIN cases c ON c.id = cn.case_id
        WHERE cn.case_id = $1
          AND c.contact_id = $2
          AND c.client_viewable = true
          AND cn.visible_to_client = true

        UNION ALL

        SELECT
          co.id,
          'outcome'::text AS type,
          co.created_at,
          COALESCE(co.outcome_type, 'Outcome') AS title,
          co.notes AS content,
          jsonb_build_object(
            'outcome_date', co.outcome_date
          ) AS metadata
        FROM case_outcomes co
        JOIN cases c ON c.id = co.case_id
        WHERE co.case_id = $1
          AND c.contact_id = $2
          AND c.client_viewable = true
          AND co.visible_to_client = true

        UNION ALL

        SELECT
          cd.id,
          'document'::text AS type,
          COALESCE(cd.created_at, cd.uploaded_at) AS created_at,
          COALESCE(cd.document_name, cd.original_filename, 'Document') AS title,
          cd.description AS content,
          jsonb_build_object(
            'document_type', cd.document_type,
            'mime_type', cd.mime_type,
            'file_size', cd.file_size,
            'document_id', cd.id
          ) AS metadata
        FROM case_documents cd
        JOIN cases c ON c.id = cd.case_id
        WHERE cd.case_id = $1
          AND c.contact_id = $2
          AND c.client_viewable = true
          AND cd.visible_to_client = true
          AND COALESCE(cd.is_active, true) = true
      ) timeline
      WHERE (
        $3::timestamptz IS NULL
        OR timeline.created_at < $3::timestamptz
        OR (timeline.created_at = $3::timestamptz AND timeline.id::text < $4::text)
      )
      ORDER BY created_at DESC, id DESC
      LIMIT $5
    `,
      [caseId, contactId, cursor?.createdAt || null, cursor?.id || null, pageSize]
    );

    const rows = result.rows as Array<{ id: string; created_at: Date | string }>;
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && items.length > 0 ? this.encodeTimelineCursor(items[items.length - 1]) : null;

    return {
      items,
      page: {
        limit,
        has_more: hasMore,
        next_cursor: nextCursor,
      },
    };
  }

  async getPortalCaseDocuments(contactId: string, caseId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `
      SELECT
        cd.id,
        cd.document_name,
        COALESCE(cd.original_filename, cd.document_name) AS original_filename,
        cd.document_type,
        cd.description,
        cd.file_size,
        cd.mime_type,
        COALESCE(cd.created_at, cd.uploaded_at) AS created_at
      FROM case_documents cd
      JOIN cases c ON c.id = cd.case_id
      WHERE cd.case_id = $1
        AND c.contact_id = $2
        AND c.client_viewable = true
        AND cd.visible_to_client = true
        AND COALESCE(cd.is_active, true) = true
      ORDER BY COALESCE(cd.created_at, cd.uploaded_at) DESC
    `,
      [caseId, contactId]
    );

    return result.rows;
  }

  async getPortalCaseDownloadableDocument(
    contactId: string,
    caseId: string,
    documentId: string
  ): Promise<{ file_path: string; original_filename: string; mime_type: string } | null> {
    const result = await this.pool.query(
      `
      SELECT
        cd.file_path,
        COALESCE(cd.original_filename, cd.document_name) AS original_filename,
        cd.mime_type
      FROM case_documents cd
      JOIN cases c ON c.id = cd.case_id
      WHERE cd.id = $1
        AND cd.case_id = $2
        AND c.contact_id = $3
        AND c.client_viewable = true
        AND cd.visible_to_client = true
        AND COALESCE(cd.is_active, true) = true
      LIMIT 1
    `,
      [documentId, caseId, contactId]
    );

    return result.rows[0] ?? null;
  }

  async getPortalDocuments(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'created_at' | 'title' | 'document_type' | 'original_name';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    const { limit, offset } = this.normalizeOffsetPage(query);
    const search = this.normalizeSearch(query?.search);
    const sortColumns: Record<'created_at' | 'title' | 'document_type' | 'original_name', string> = {
      created_at: 'cd.created_at',
      title: 'LOWER(COALESCE(cd.title, cd.original_name))',
      document_type: 'LOWER(cd.document_type)',
      original_name: 'LOWER(cd.original_name)',
    };
    const sort = query?.sort ?? 'created_at';
    const sortColumn = sortColumns[sort];
    const order = query?.order === 'asc' ? 'ASC' : 'DESC';

    const totalResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM contact_documents cd
       WHERE cd.contact_id = $1
         AND cd.is_active = true
         AND cd.is_portal_visible = true
         AND (
           cd.case_id IS NULL
           OR EXISTS (
             SELECT 1
             FROM cases c
             WHERE c.id = cd.case_id
               AND c.contact_id = $1
               AND c.client_viewable = true
           )
         )
         AND (
           $2::text IS NULL
           OR concat_ws(' ', cd.title, cd.original_name, cd.document_type, cd.description, cd.mime_type)
             ILIKE '%' || $2 || '%'
         )`,
      [contactId, search]
    );
    const total = Number(totalResult.rows[0]?.count ?? '0');

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT
         cd.id,
         cd.original_name,
         cd.document_type,
         cd.title,
         cd.description,
         cd.file_size,
         cd.mime_type,
         cd.created_at
       FROM contact_documents cd
       WHERE cd.contact_id = $1
         AND cd.is_active = true
         AND cd.is_portal_visible = true
         AND (
           cd.case_id IS NULL
           OR EXISTS (
             SELECT 1
             FROM cases c
             WHERE c.id = cd.case_id
               AND c.contact_id = $1
               AND c.client_viewable = true
           )
         )
         AND (
           $2::text IS NULL
           OR concat_ws(' ', cd.title, cd.original_name, cd.document_type, cd.description, cd.mime_type)
             ILIKE '%' || $2 || '%'
         )
       ORDER BY ${sortColumn} ${order}, cd.id ${order}
       LIMIT $3 OFFSET $4`,
      [contactId, search, limit, offset]
    );

    return {
      items: result.rows,
      page: this.buildOffsetPage(limit, offset, total),
    };
  }

  async getPortalForms(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'created_at' | 'title' | 'document_type' | 'original_name';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    const { limit, offset } = this.normalizeOffsetPage(query);
    const search = this.normalizeSearch(query?.search);
    const sortColumns: Record<'created_at' | 'title' | 'document_type' | 'original_name', string> = {
      created_at: 'cd.created_at',
      title: 'LOWER(COALESCE(cd.title, cd.original_name))',
      document_type: 'LOWER(cd.document_type)',
      original_name: 'LOWER(cd.original_name)',
    };
    const sort = query?.sort ?? 'created_at';
    const sortColumn = sortColumns[sort];
    const order = query?.order === 'asc' ? 'ASC' : 'DESC';

    const totalResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM contact_documents cd
       WHERE cd.contact_id = $1
         AND cd.is_active = true
         AND cd.is_portal_visible = true
         AND cd.document_type IN ('consent_form', 'assessment', 'report')
         AND (
           cd.case_id IS NULL
           OR EXISTS (
             SELECT 1
             FROM cases c
             WHERE c.id = cd.case_id
               AND c.contact_id = $1
               AND c.client_viewable = true
           )
         )
         AND (
           $2::text IS NULL
           OR concat_ws(' ', cd.title, cd.original_name, cd.document_type, cd.description)
             ILIKE '%' || $2 || '%'
         )`,
      [contactId, search]
    );
    const total = Number(totalResult.rows[0]?.count ?? '0');

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT
         cd.id,
         cd.original_name,
         cd.document_type,
         cd.title,
         cd.description,
         cd.created_at
       FROM contact_documents cd
       WHERE cd.contact_id = $1
         AND cd.is_active = true
         AND cd.is_portal_visible = true
         AND cd.document_type IN ('consent_form', 'assessment', 'report')
         AND (
           cd.case_id IS NULL
           OR EXISTS (
             SELECT 1
             FROM cases c
             WHERE c.id = cd.case_id
               AND c.contact_id = $1
               AND c.client_viewable = true
           )
         )
         AND (
           $2::text IS NULL
           OR concat_ws(' ', cd.title, cd.original_name, cd.document_type, cd.description)
             ILIKE '%' || $2 || '%'
         )
       ORDER BY ${sortColumn} ${order}, cd.id ${order}
       LIMIT $3 OFFSET $4`,
      [contactId, search, limit, offset]
    );

    return {
      items: result.rows,
      page: this.buildOffsetPage(limit, offset, total),
    };
  }

  async getPortalNotes(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'created_at' | 'subject' | 'note_type';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    const { limit, offset } = this.normalizeOffsetPage(query);
    const search = this.normalizeSearch(query?.search);
    const sortColumns: Record<'created_at' | 'subject' | 'note_type', string> = {
      created_at: 'cn.created_at',
      subject: "LOWER(COALESCE(cn.subject, ''))",
      note_type: 'LOWER(cn.note_type)',
    };
    const sort = query?.sort ?? 'created_at';
    const sortColumn = sortColumns[sort];
    const order = query?.order === 'asc' ? 'ASC' : 'DESC';

    const totalResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM contact_notes cn
       WHERE cn.contact_id = $1
         AND cn.is_internal = false
         AND cn.is_portal_visible = true
         AND (
           cn.case_id IS NULL
           OR EXISTS (
             SELECT 1
             FROM cases c
             WHERE c.id = cn.case_id
               AND c.contact_id = $1
               AND c.client_viewable = true
           )
         )
         AND (
           $2::text IS NULL
           OR concat_ws(' ', cn.note_type, cn.subject, cn.content) ILIKE '%' || $2 || '%'
         )`,
      [contactId, search]
    );
    const total = Number(totalResult.rows[0]?.count ?? '0');

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT
         cn.id,
         cn.note_type,
         cn.subject,
         cn.content,
         cn.created_at
       FROM contact_notes cn
       WHERE cn.contact_id = $1
         AND cn.is_internal = false
         AND cn.is_portal_visible = true
         AND (
           cn.case_id IS NULL
           OR EXISTS (
             SELECT 1
             FROM cases c
             WHERE c.id = cn.case_id
               AND c.contact_id = $1
               AND c.client_viewable = true
           )
         )
         AND (
           $2::text IS NULL
           OR concat_ws(' ', cn.note_type, cn.subject, cn.content) ILIKE '%' || $2 || '%'
         )
       ORDER BY ${sortColumn} ${order}, cn.id ${order}
       LIMIT $3 OFFSET $4`,
      [contactId, search, limit, offset]
    );

    return {
      items: result.rows,
      page: this.buildOffsetPage(limit, offset, total),
    };
  }

  async getPortalReminders(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'date' | 'title' | 'type';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    const { limit, offset } = this.normalizeOffsetPage(query);
    const search = this.normalizeSearch(query?.search);
    const sortColumns: Record<'date' | 'title' | 'type', string> = {
      date: 'reminder.date',
      title: 'LOWER(reminder.title)',
      type: 'LOWER(reminder.type)',
    };
    const sort = query?.sort ?? 'date';
    const sortColumn = sortColumns[sort];
    const order = query?.order === 'desc' ? 'DESC' : 'ASC';

    const totalResult = await this.pool.query<{ count: string }>(
      `WITH reminder AS (
          SELECT
            'appointment'::text AS type,
            a.id::text AS id,
            COALESCE(NULLIF(a.title, ''), 'Appointment') AS title,
            a.start_time AS date
          FROM appointments a
          WHERE a.contact_id = $1
            AND a.status = 'confirmed'
            AND a.start_time >= NOW()
            AND (
              a.case_id IS NULL
              OR EXISTS (
                SELECT 1
                FROM cases c
                WHERE c.id = a.case_id
                  AND c.contact_id = $1
                  AND c.client_viewable = true
              )
            )

          UNION ALL

          SELECT
            'event'::text AS type,
            e.id::text AS id,
            e.name AS title,
            e.start_date AS date
          FROM event_registrations er
          JOIN events e ON e.id = er.event_id
          WHERE er.contact_id = $1
            AND er.registration_status IN ('registered', 'confirmed')
            AND e.start_date >= NOW()
            AND e.status NOT IN ('cancelled', 'completed')
        )
       SELECT COUNT(*)::text AS count
       FROM reminder
       WHERE (
         $2::text IS NULL
         OR concat_ws(' ', reminder.type, reminder.title, reminder.date::text) ILIKE '%' || $2 || '%'
       )`,
      [contactId, search]
    );
    const total = Number(totalResult.rows[0]?.count ?? '0');

    const result = await this.pool.query<Record<string, unknown>>(
      `WITH reminder AS (
          SELECT
            'appointment'::text AS type,
            a.id::text AS id,
            COALESCE(NULLIF(a.title, ''), 'Appointment') AS title,
            a.start_time AS date
          FROM appointments a
          WHERE a.contact_id = $1
            AND a.status = 'confirmed'
            AND a.start_time >= NOW()
            AND (
              a.case_id IS NULL
              OR EXISTS (
                SELECT 1
                FROM cases c
                WHERE c.id = a.case_id
                  AND c.contact_id = $1
                  AND c.client_viewable = true
              )
            )

          UNION ALL

          SELECT
            'event'::text AS type,
            e.id::text AS id,
            e.name AS title,
            e.start_date AS date
          FROM event_registrations er
          JOIN events e ON e.id = er.event_id
          WHERE er.contact_id = $1
            AND er.registration_status IN ('registered', 'confirmed')
            AND e.start_date >= NOW()
            AND e.status NOT IN ('cancelled', 'completed')
        )
       SELECT reminder.type, reminder.id, reminder.title, reminder.date
       FROM reminder
       WHERE (
         $2::text IS NULL
         OR concat_ws(' ', reminder.type, reminder.title, reminder.date::text) ILIKE '%' || $2 || '%'
       )
       ORDER BY ${sortColumn} ${order}, reminder.id ${order}
       LIMIT $3 OFFSET $4`,
      [contactId, search, limit, offset]
    );

    return {
      items: result.rows,
      page: this.buildOffsetPage(limit, offset, total),
    };
  }

  async getDownloadableDocument(
    contactId: string,
    documentId: string
  ): Promise<{ file_path: string; original_name: string; mime_type: string } | null> {
    const result = await this.pool.query(
      `SELECT
         cd.file_path,
         cd.original_name,
         cd.mime_type
       FROM contact_documents cd
       WHERE cd.id = $1
         AND cd.contact_id = $2
         AND cd.is_active = true
         AND cd.is_portal_visible = true
         AND (
           cd.case_id IS NULL
           OR EXISTS (
             SELECT 1
             FROM cases c
             WHERE c.id = cd.case_id
               AND c.contact_id = $2
               AND c.client_viewable = true
           )
         )`,
      [documentId, contactId]
    );

    return result.rows[0] ?? null;
  }
}
