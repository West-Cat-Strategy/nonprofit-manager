import { Pool } from 'pg';
import type { CaseFilter, CaseSummary, CaseTimelineEvent, CaseWithDetails } from '@app-types/case';
import {
  decodeTimelineCursor,
  DEFAULT_TIMELINE_LIMIT,
  encodeTimelineCursor,
  MAX_TIMELINE_LIMIT,
  requireCaseOwnership,
} from './shared';

export const getCasesQuery = async (
  db: Pool,
  filter: CaseFilter = {}
): Promise<{ cases: CaseWithDetails[]; total: number }> => {
  const filters: string[] = [];
  const params: unknown[] = [];
  let needsStatusJoin = false;

  const addFilter = (sql: string, value?: unknown) => {
    if (value !== undefined) {
      params.push(value);
      filters.push(sql.replace('?', `$${params.length}`));
    } else {
      filters.push(sql);
    }
  };

  if (filter.contact_id) {
    addFilter('c.contact_id = ?', filter.contact_id);
  }

  if (filter.case_type_id) {
    addFilter('c.case_type_id = ?', filter.case_type_id);
  }

  if (filter.status_id) {
    addFilter('c.status_id = ?', filter.status_id);
  }

  if (filter.priority) {
    addFilter('c.priority = ?', filter.priority);
  }

  if (filter.assigned_to) {
    addFilter('c.assigned_to = ?', filter.assigned_to);
  }

  if (filter.is_urgent !== undefined) {
    addFilter('c.is_urgent = ?', filter.is_urgent);
  }

  if (filter.quick_filter) {
    if (filter.quick_filter === 'active') {
      needsStatusJoin = true;
      filters.push(`cs.status_type NOT IN ('closed', 'cancelled')`);
    }

    if (filter.quick_filter === 'urgent') {
      filters.push(`(c.is_urgent = true OR c.priority = 'urgent')`);
    }

    if (filter.quick_filter === 'unassigned') {
      needsStatusJoin = true;
      filters.push('c.assigned_to IS NULL');
      filters.push(`cs.status_type NOT IN ('closed', 'cancelled')`);
    }

    if (filter.quick_filter === 'overdue') {
      needsStatusJoin = true;
      filters.push('c.due_date IS NOT NULL');
      filters.push('c.due_date < NOW()');
      filters.push(`cs.status_type NOT IN ('closed', 'cancelled')`);
    }

    if (filter.quick_filter === 'due_soon') {
      needsStatusJoin = true;
      const days =
        typeof filter.due_within_days === 'number' && filter.due_within_days > 0
          ? filter.due_within_days
          : 7;
      filters.push('c.due_date IS NOT NULL');
      params.push(days);
      filters.push(`c.due_date >= NOW() AND c.due_date <= NOW() + ($${params.length} * INTERVAL '1 day')`);
      filters.push(`cs.status_type NOT IN ('closed', 'cancelled')`);
    }
  }

  if (filter.search) {
    const searchValue = `%${filter.search}%`;
    params.push(searchValue, searchValue, searchValue);
    filters.push(
      `(c.case_number ILIKE $${params.length - 2} OR c.title ILIKE $${params.length - 1} OR c.description ILIKE $${params.length})`
    );
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const countJoinClause = needsStatusJoin ? 'LEFT JOIN case_statuses cs ON c.status_id = cs.id' : '';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM cases c ${countJoinClause} ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  let query = `
    SELECT c.*,
      ct.name as case_type_name, ct.color as case_type_color, ct.icon as case_type_icon,
      cs.name as status_name, cs.color as status_color, cs.status_type,
      con.first_name as contact_first_name, con.last_name as contact_last_name,
      con.email as contact_email, con.phone as contact_phone,
      u.first_name as assigned_first_name, u.last_name as assigned_last_name,
      (SELECT COUNT(*) FROM case_notes WHERE case_id = c.id) as notes_count,
      (SELECT COUNT(*) FROM case_documents WHERE case_id = c.id) as documents_count
    FROM cases c
    LEFT JOIN case_types ct ON c.case_type_id = ct.id
    LEFT JOIN case_statuses cs ON c.status_id = cs.id
    LEFT JOIN contacts con ON c.contact_id = con.id
    LEFT JOIN users u ON c.assigned_to = u.id
    ${whereClause}
  `;

  const sortColumns: Record<string, string> = {
    created_at: 'c.created_at',
    updated_at: 'c.updated_at',
    case_number: 'c.case_number',
    title: 'c.title',
    priority: 'c.priority',
    due_date: 'c.due_date',
    status_id: 'c.status_id',
    case_type_id: 'c.case_type_id',
    intake_date: 'c.intake_date',
  };

  const sortBy = sortColumns[filter.sort_by || 'created_at'] || 'c.created_at';
  const sortOrder = filter.sort_order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortBy} ${sortOrder}`;

  const limit = filter.limit || 20;
  const offset = ((filter.page || 1) - 1) * limit;
  params.push(limit, offset);
  query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await db.query(query, params);
  return { cases: result.rows, total };
};

export const getCaseByIdQuery = async (
  db: Pool,
  caseId: string
): Promise<CaseWithDetails | null> => {
  const result = await db.query(
    `
    SELECT c.*,
      ct.name as case_type_name, ct.color as case_type_color, ct.icon as case_type_icon,
      cs.name as status_name, cs.color as status_color, cs.status_type,
      con.first_name as contact_first_name, con.last_name as contact_last_name,
      con.email as contact_email, con.phone as contact_phone,
      u.first_name as assigned_first_name, u.last_name as assigned_last_name, u.email as assigned_email,
      (SELECT COUNT(*) FROM case_notes WHERE case_id = c.id) as notes_count,
      (SELECT COUNT(*) FROM case_documents WHERE case_id = c.id) as documents_count,
      (SELECT COUNT(*) FROM case_services WHERE case_id = c.id) as services_count
    FROM cases c
    LEFT JOIN case_types ct ON c.case_type_id = ct.id
    LEFT JOIN case_statuses cs ON c.status_id = cs.id
    LEFT JOIN contacts con ON c.contact_id = con.id
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.id = $1
  `,
    [caseId]
  );

  return result.rows[0] || null;
};

export const getCaseTimelineQuery = async (
  db: Pool,
  caseId: string,
  options?: { limit?: number; cursor?: string }
): Promise<{ items: CaseTimelineEvent[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> => {
  await requireCaseOwnership(db, caseId);
  const requestedLimit = options?.limit ?? DEFAULT_TIMELINE_LIMIT;
  const limit = Math.max(1, Math.min(requestedLimit, MAX_TIMELINE_LIMIT));
  const cursor = decodeTimelineCursor(options?.cursor);
  const pageSize = limit + 1;

  const result = await db.query(
    `
    SELECT * FROM (
      SELECT
        cn.id,
        'note'::text AS type,
        cn.case_id,
        cn.created_at,
        cn.visible_to_client,
        COALESCE(cn.subject, cn.note_type, 'Note') AS title,
        cn.content,
        jsonb_build_object(
          'note_type', cn.note_type,
          'category', cn.category,
          'is_important', cn.is_important,
          'is_internal', cn.is_internal
        ) AS metadata,
        cn.created_by,
        u.first_name,
        u.last_name
      FROM case_notes cn
      LEFT JOIN users u ON u.id = cn.created_by
      WHERE cn.case_id = $1

      UNION ALL

      SELECT
        co.id,
        'outcome'::text AS type,
        co.case_id,
        co.created_at,
        co.visible_to_client,
        COALESCE(co.outcome_type, 'Outcome') AS title,
        co.notes AS content,
        jsonb_build_object(
          'outcome_date', co.outcome_date
        ) AS metadata,
        co.created_by,
        u.first_name,
        u.last_name
      FROM case_outcomes co
      LEFT JOIN users u ON u.id = co.created_by
      WHERE co.case_id = $1

      UNION ALL

      SELECT
        cte.id,
        'topic'::text AS type,
        cte.case_id,
        cte.created_at,
        false AS visible_to_client,
        ctd.name AS title,
        cte.notes AS content,
        jsonb_build_object(
          'discussed_at', cte.discussed_at
        ) AS metadata,
        cte.created_by,
        u.first_name,
        u.last_name
      FROM case_topic_events cte
      JOIN case_topic_definitions ctd ON ctd.id = cte.topic_definition_id
      LEFT JOIN users u ON u.id = cte.created_by
      WHERE cte.case_id = $1

      UNION ALL

      SELECT
        cd.id,
        'document'::text AS type,
        cd.case_id,
        COALESCE(cd.created_at, cd.uploaded_at) AS created_at,
        cd.visible_to_client,
        COALESCE(cd.document_name, cd.original_filename, cd.file_name, 'Document') AS title,
        cd.description AS content,
        jsonb_build_object(
          'document_type', cd.document_type,
          'mime_type', cd.mime_type,
          'file_size', cd.file_size,
          'original_filename', COALESCE(cd.original_filename, cd.document_name)
        ) AS metadata,
        cd.uploaded_by AS created_by,
        u.first_name,
        u.last_name
      FROM case_documents cd
      LEFT JOIN users u ON u.id = cd.uploaded_by
      WHERE cd.case_id = $1
        AND COALESCE(cd.is_active, true) = true
    ) timeline
    WHERE (
      $2::timestamptz IS NULL
      OR timeline.created_at < $2::timestamptz
      OR (timeline.created_at = $2::timestamptz AND timeline.id::text < $3::text)
    )
    ORDER BY created_at DESC, id DESC
    LIMIT $4
  `,
    [caseId, cursor?.createdAt || null, cursor?.id || null, pageSize]
  );

  const rows = result.rows as CaseTimelineEvent[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && items.length > 0 ? encodeTimelineCursor(items[items.length - 1]) : null;

  return {
    items,
    page: {
      limit,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  };
};

export const getCaseSummaryQuery = async (db: Pool, organizationId?: string): Promise<CaseSummary> => {
  const scopeParams: string[] = [];
  const scopeValues: unknown[] = [];
  if (organizationId) {
    scopeValues.push(organizationId);
    scopeParams.push(`COALESCE(c.account_id, con.account_id) = $${scopeValues.length}`);
  }
  const scopeClause = scopeParams.length > 0 ? `WHERE ${scopeParams.join(' AND ')}` : '';

  const result = await db.query(
    `
    SELECT
      COUNT(*) as total_cases,
      COUNT(*) FILTER (WHERE cs.status_type IN ('intake', 'active', 'review')) as open_cases,
      COUNT(*) FILTER (WHERE cs.status_type IN ('closed', 'cancelled')) as closed_cases,
      COUNT(*) FILTER (WHERE c.priority = 'low') as priority_low,
      COUNT(*) FILTER (WHERE c.priority = 'medium') as priority_medium,
      COUNT(*) FILTER (WHERE c.priority = 'high') as priority_high,
      COUNT(*) FILTER (WHERE c.priority = 'urgent') as priority_urgent,
      COUNT(*) FILTER (WHERE cs.status_type = 'intake') as status_intake,
      COUNT(*) FILTER (WHERE cs.status_type = 'active') as status_active,
      COUNT(*) FILTER (WHERE cs.status_type = 'review') as status_review,
      COUNT(*) FILTER (WHERE cs.status_type = 'closed') as status_closed,
      COUNT(*) FILTER (WHERE cs.status_type = 'cancelled') as status_cancelled,
      COUNT(*) FILTER (WHERE c.due_date <= CURRENT_DATE + INTERVAL '7 days' AND c.due_date >= CURRENT_DATE) as due_this_week,
      COUNT(*) FILTER (WHERE c.due_date < CURRENT_DATE AND cs.status_type NOT IN ('closed', 'cancelled')) as overdue,
      COUNT(*) FILTER (WHERE c.assigned_to IS NULL AND cs.status_type NOT IN ('closed', 'cancelled')) as unassigned,
      AVG(EXTRACT(EPOCH FROM (COALESCE(c.closed_date, NOW()) - c.intake_date)) / 86400)
        FILTER (WHERE cs.status_type IN ('closed', 'cancelled')) as avg_duration
    FROM cases c
    LEFT JOIN contacts con ON con.id = c.contact_id
    LEFT JOIN case_statuses cs ON c.status_id = cs.id
    ${scopeClause}
  `,
    scopeValues
  );

  const typeResult = await db.query(
    `
    SELECT ct.name, COUNT(*) as count
    FROM cases c
    LEFT JOIN contacts con ON con.id = c.contact_id
    JOIN case_types ct ON c.case_type_id = ct.id
    ${scopeClause}
    GROUP BY ct.name
    ORDER BY count DESC
  `,
    scopeValues
  );

  const byCaseType: Record<string, number> = {};
  for (const row of typeResult.rows) {
    byCaseType[row.name] = parseInt(row.count, 10);
  }

  const row = result.rows[0];
  return {
    total_cases: parseInt(row.total_cases, 10),
    open_cases: parseInt(row.open_cases, 10),
    closed_cases: parseInt(row.closed_cases, 10),
    by_priority: {
      low: parseInt(row.priority_low, 10),
      medium: parseInt(row.priority_medium, 10),
      high: parseInt(row.priority_high, 10),
      urgent: parseInt(row.priority_urgent, 10),
    },
    by_status_type: {
      intake: parseInt(row.status_intake, 10),
      active: parseInt(row.status_active, 10),
      review: parseInt(row.status_review, 10),
      closed: parseInt(row.status_closed, 10),
      cancelled: parseInt(row.status_cancelled, 10),
    },
    by_case_type: byCaseType,
    average_case_duration_days: row.avg_duration ? Math.round(parseFloat(row.avg_duration)) : undefined,
    cases_due_this_week: parseInt(row.due_this_week, 10),
    overdue_cases: parseInt(row.overdue, 10),
    unassigned_cases: parseInt(row.unassigned, 10),
  };
};

export const getCaseTypesQuery = async (db: Pool): Promise<unknown[]> => {
  const result = await db.query(`SELECT * FROM case_types WHERE is_active = true ORDER BY name`);
  return result.rows;
};

export const getCaseStatusesQuery = async (db: Pool): Promise<unknown[]> => {
  const result = await db.query(`SELECT * FROM case_statuses WHERE is_active = true ORDER BY sort_order`);
  return result.rows;
};
