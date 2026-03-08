import { Pool } from 'pg';
import {
  PORTAL_EVENT_COLUMNS,
  PortalListOrder,
  PortalPagedResult,
  PortalRepositorySupport,
} from './shared';

export class PortalResourceRepository {
  constructor(
    private readonly pool: Pool,
    private readonly support: PortalRepositorySupport
  ) {}

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
    const { limit, offset } = this.support.normalizeOffsetPage(query);
    const search = this.support.normalizeSearch(query?.search);
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
      page: this.support.buildOffsetPage(limit, offset, total),
    };
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
    const { limit, offset } = this.support.normalizeOffsetPage(query);
    const search = this.support.normalizeSearch(query?.search);
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
      page: this.support.buildOffsetPage(limit, offset, total),
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
    const { limit, offset } = this.support.normalizeOffsetPage(query);
    const search = this.support.normalizeSearch(query?.search);
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
      page: this.support.buildOffsetPage(limit, offset, total),
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
    const { limit, offset } = this.support.normalizeOffsetPage(query);
    const search = this.support.normalizeSearch(query?.search);
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
      page: this.support.buildOffsetPage(limit, offset, total),
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
    const { limit, offset } = this.support.normalizeOffsetPage(query);
    const search = this.support.normalizeSearch(query?.search);
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
      page: this.support.buildOffsetPage(limit, offset, total),
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
