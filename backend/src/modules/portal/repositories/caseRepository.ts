import { Pool } from 'pg';
import { PortalRepositorySupport } from './shared';
import { buildPortalCaseProvenance } from '../../cases/utils/importProvenance';

export class PortalCaseRepository {
  constructor(
    private readonly pool: Pool,
    private readonly support: PortalRepositorySupport
  ) {}

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
        c.custom_data,
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

    return result.rows.map((row) => ({
      ...row,
      provenance: buildPortalCaseProvenance(row.custom_data),
    }));
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
        c.custom_data,
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

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    return {
      ...row,
      provenance: buildPortalCaseProvenance(row.custom_data),
    };
  }

  async getPortalCaseTimeline(
    contactId: string,
    caseId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ items: unknown[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> {
    const requestedLimit = options?.limit ?? this.support.timelineDefaults.defaultLimit;
    const limit = Math.max(1, Math.min(requestedLimit, this.support.timelineDefaults.maxLimit));
    const cursor = this.support.decodeTimelineCursor(options?.cursor);
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
<<<<<<< HEAD

        UNION ALL

        SELECT
          a.id,
          'appointment'::text AS type,
          a.created_at,
          COALESCE(a.title, 'Appointment') AS title,
          a.description AS content,
          jsonb_build_object(
            'start_time', a.start_time,
            'end_time', a.end_time,
            'status', a.status,
            'location', a.location,
            'request_type', a.request_type
          ) AS metadata
        FROM appointments a
        WHERE a.case_id = $1
          AND a.contact_id = $2
          AND a.status != 'cancelled'
=======
>>>>>>> origin/main
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
      hasMore && items.length > 0 ? this.support.encodeTimelineCursor(items[items.length - 1]) : null;

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
}
