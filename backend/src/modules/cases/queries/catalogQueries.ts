import { Pool } from 'pg';
import type { CaseFilter, CaseSummary, CaseTimelineEvent, CaseWithDetails } from '@app-types/case';
import {
  decodeTimelineCursor,
  DEFAULT_TIMELINE_LIMIT,
  encodeTimelineCursor,
  MAX_TIMELINE_LIMIT,
  requireCaseOwnership,
} from './shared';

const CASE_COLUMNS = `
  c.id,
  c.case_number,
  c.contact_id,
  c.account_id,
  c.case_type_id,
  c.status_id,
  c.priority,
  c.title,
  c.description,
  c.source,
  c.referral_source,
  c.intake_date,
  c.opened_date,
  c.closed_date,
  c.due_date,
  c.assigned_to,
  c.assigned_team,
  c.outcome,
  c.outcome_notes,
  c.closure_reason,
  c.intake_data,
  c.custom_data,
  c.is_urgent,
  c.requires_followup,
  c.followup_date,
  c.tags,
  c.client_viewable,
  c.created_at,
  c.updated_at,
  c.created_by,
  c.modified_by
`;

const CASE_SEARCH_SQL = `concat_ws(' ', c.case_number, c.title, c.description)`;

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
      filters.push(`filter_cs.status_type NOT IN ('closed', 'cancelled')`);
    }

    if (filter.quick_filter === 'urgent') {
      filters.push(`(c.is_urgent = true OR c.priority = 'urgent')`);
    }

    if (filter.quick_filter === 'unassigned') {
      needsStatusJoin = true;
      filters.push('c.assigned_to IS NULL');
      filters.push(`filter_cs.status_type NOT IN ('closed', 'cancelled')`);
    }

    if (filter.quick_filter === 'overdue') {
      needsStatusJoin = true;
      filters.push('c.due_date IS NOT NULL');
      filters.push('c.due_date < NOW()');
      filters.push(`filter_cs.status_type NOT IN ('closed', 'cancelled')`);
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
      filters.push(`filter_cs.status_type NOT IN ('closed', 'cancelled')`);
    }
  }

  if (filter.search) {
    params.push(`%${filter.search}%`);
    filters.push(`${CASE_SEARCH_SQL} ILIKE $${params.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const filterStatusJoin = needsStatusJoin
    ? 'LEFT JOIN case_statuses filter_cs ON c.status_id = filter_cs.id'
    : '';

  const sortColumns: Record<string, string> = {
    created_at: 'created_at',
    updated_at: 'updated_at',
    case_number: 'case_number',
    title: 'title',
    priority: 'priority',
    due_date: 'due_date',
    status_id: 'status_id',
    case_type_id: 'case_type_id',
    intake_date: 'intake_date',
  };

  const sortBy = sortColumns[filter.sort_by || 'created_at'] || 'created_at';
  const sortOrder = filter.sort_order === 'asc' ? 'ASC' : 'DESC';
  const limit = filter.limit || 20;
  const offset = ((filter.page || 1) - 1) * limit;
  params.push(limit, offset);

  const query = `
    WITH filtered_cases AS (
      SELECT ${CASE_COLUMNS}
      FROM cases c
      ${filterStatusJoin}
      ${whereClause}
    ),
    paged_cases AS (
      SELECT
        fc.*,
        COUNT(*) OVER()::int AS total_count
      FROM filtered_cases fc
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    ),
    note_counts AS (
      SELECT case_id, COUNT(*)::int AS notes_count
      FROM case_notes
      WHERE case_id IN (SELECT id FROM paged_cases)
      GROUP BY case_id
    ),
    document_counts AS (
      SELECT case_id, COUNT(*)::int AS documents_count
      FROM case_documents
      WHERE case_id IN (SELECT id FROM paged_cases)
      GROUP BY case_id
    )
    SELECT
      pc.*,
      ct.name as case_type_name, ct.color as case_type_color, ct.icon as case_type_icon,
      cs.name as status_name, cs.color as status_color, cs.status_type,
      con.first_name as contact_first_name, con.last_name as contact_last_name,
      con.email as contact_email, con.phone as contact_phone,
      u.first_name as assigned_first_name, u.last_name as assigned_last_name,
      COALESCE(note_counts.notes_count, 0) as notes_count,
      COALESCE(document_counts.documents_count, 0) as documents_count
    FROM paged_cases pc
    LEFT JOIN case_types ct ON pc.case_type_id = ct.id
    LEFT JOIN case_statuses cs ON pc.status_id = cs.id
    LEFT JOIN contacts con ON pc.contact_id = con.id
    LEFT JOIN users u ON pc.assigned_to = u.id
    LEFT JOIN note_counts ON note_counts.case_id = pc.id
    LEFT JOIN document_counts ON document_counts.case_id = pc.id
    ORDER BY pc.${sortBy} ${sortOrder}
  `;
  const result = await db.query(query, params);
  const rows = result.rows as Array<CaseWithDetails & { total_count?: number | string }>;
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const cases = rows.map(({ total_count: _totalCount, ...row }) => row as CaseWithDetails);
  return { cases, total };
};

export const getCaseByIdQuery = async (
  db: Pool,
  caseId: string
): Promise<CaseWithDetails | null> => {
  const result = await db.query(
    `
    SELECT ${CASE_COLUMNS},
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
    SELECT
      timeline.id,
      timeline.type,
      timeline.case_id,
      timeline.created_at,
      timeline.visible_to_client,
      timeline.title,
      timeline.content,
      timeline.metadata,
      timeline.created_by,
      timeline.first_name,
      timeline.last_name
    FROM (
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
          'outcome_date', co.outcome_date,
          'workflow_stage', co.workflow_stage,
          'source_entity_type', co.source_entity_type,
          'source_entity_id', co.source_entity_id
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

      UNION ALL

      SELECT
        a.id,
        'appointment'::text AS type,
        a.case_id,
        COALESCE(a.checked_in_at, a.updated_at, a.created_at) AS created_at,
        true AS visible_to_client,
        COALESCE(a.title, 'Appointment') AS title,
        a.description AS content,
        jsonb_build_object(
          'status', a.status,
          'start_time', a.start_time,
          'end_time', a.end_time,
          'location', a.location,
          'attendance_state', CASE
            WHEN a.status = 'cancelled' THEN 'cancelled'
            WHEN a.checked_in_at IS NOT NULL OR a.status = 'completed' THEN 'attended'
            WHEN a.status IN ('requested', 'confirmed') AND COALESCE(a.end_time, a.start_time) < NOW() THEN 'no_show'
            ELSE 'scheduled'
          END,
          'pending_reminder_jobs', (
            SELECT COUNT(*)::int
            FROM appointment_reminder_jobs arj
            WHERE arj.appointment_id = a.id
              AND arj.status IN ('pending', 'processing')
          ),
          'last_reminder_sent_at', (
            SELECT MAX(ard.sent_at)
            FROM appointment_reminder_deliveries ard
            WHERE ard.appointment_id = a.id
          ),
          'missing_note', CASE
            WHEN a.status IN ('completed', 'cancelled') AND NOT EXISTS (
              SELECT 1
              FROM case_notes cn
              WHERE cn.case_id = a.case_id
                AND cn.source_entity_type = 'appointment'
                AND cn.source_entity_id = a.id
            ) THEN true
            ELSE false
          END,
          'missing_outcome', CASE
            WHEN a.status IN ('completed', 'cancelled') AND NOT EXISTS (
              SELECT 1
              FROM case_outcomes co
              WHERE co.case_id = a.case_id
                AND co.source_entity_type = 'appointment'
                AND co.source_entity_id = a.id
            ) THEN true
            ELSE false
          END
        ) AS metadata,
        a.pointperson_user_id AS created_by,
        pointperson.first_name,
        pointperson.last_name
      FROM appointments a
      LEFT JOIN users pointperson ON pointperson.id = a.pointperson_user_id
      WHERE a.case_id = $1

      UNION ALL

      SELECT
        t.id,
        'conversation'::text AS type,
        t.case_id,
        COALESCE(t.closed_at, t.last_message_at, t.created_at) AS created_at,
        true AS visible_to_client,
        COALESCE(t.subject, 'Portal conversation') AS title,
        t.last_message_preview AS content,
        jsonb_build_object(
          'status', t.status,
          'portal_email', pu.email,
          'last_message_at', t.last_message_at,
          'linked_note_count', (
            SELECT COUNT(*)::int
            FROM case_notes cn
            WHERE cn.case_id = t.case_id
              AND cn.source_entity_type = 'portal_thread'
              AND cn.source_entity_id = t.id
          ),
          'linked_outcome_count', (
            SELECT COUNT(*)::int
            FROM case_outcomes co
            WHERE co.case_id = t.case_id
              AND co.source_entity_type = 'portal_thread'
              AND co.source_entity_id = t.id
          ),
          'resolution_complete', CASE
            WHEN EXISTS (
              SELECT 1
              FROM case_notes cn
              WHERE cn.case_id = t.case_id
                AND cn.source_entity_type = 'portal_thread'
                AND cn.source_entity_id = t.id
            )
            AND EXISTS (
              SELECT 1
              FROM case_outcomes co
              WHERE co.case_id = t.case_id
                AND co.source_entity_type = 'portal_thread'
                AND co.source_entity_id = t.id
            ) THEN true
            ELSE false
          END
        ) AS metadata,
        t.closed_by AS created_by,
        closed_by_user.first_name,
        closed_by_user.last_name
      FROM portal_threads t
      LEFT JOIN portal_users pu ON pu.id = t.portal_user_id
      LEFT JOIN users closed_by_user ON closed_by_user.id = t.closed_by
      WHERE t.case_id = $1

      UNION ALL

      SELECT
        fu.id,
        'follow_up'::text AS type,
        fu.entity_id AS case_id,
        COALESCE(fu.completed_date, fu.updated_at, fu.created_at) AS created_at,
        false AS visible_to_client,
        fu.title,
        COALESCE(fu.completed_notes, fu.description) AS content,
        jsonb_build_object(
          'status', fu.status,
          'scheduled_date', fu.scheduled_date,
          'scheduled_time', fu.scheduled_time,
          'method', fu.method,
          'frequency', fu.frequency,
          'reminder_minutes_before', fu.reminder_minutes_before
        ) AS metadata,
        fu.assigned_to AS created_by,
        assignee.first_name,
        assignee.last_name
      FROM follow_ups fu
      LEFT JOIN users assignee ON assignee.id = fu.assigned_to
      WHERE fu.entity_type = 'case'
        AND fu.entity_id = $1

      UNION ALL

      SELECT
        er.id,
        'attendance'::text AS type,
        er.case_id,
        COALESCE(er.check_in_time, er.created_at) AS created_at,
        false AS visible_to_client,
        COALESCE(e.name, 'Attendance') AS title,
        er.notes AS content,
        jsonb_build_object(
          'event_id', er.event_id,
          'registration_status', er.registration_status,
          'checked_in', er.checked_in,
          'check_in_method', er.check_in_method
        ) AS metadata,
        er.checked_in_by AS created_by,
        checked_in_user.first_name,
        checked_in_user.last_name
      FROM event_registrations er
      LEFT JOIN events e ON e.id = er.event_id
      LEFT JOIN users checked_in_user ON checked_in_user.id = er.checked_in_by
      WHERE er.case_id = $1
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
  const result = await db.query(
    `SELECT
      id,
      name,
      description,
      color,
      icon,
      is_active,
      requires_intake,
      average_duration_days,
      custom_fields,
      created_at,
      updated_at,
      created_by,
      modified_by
    FROM case_types
    WHERE is_active = true
    ORDER BY name`
  );
  return result.rows;
};

export const getCaseStatusesQuery = async (db: Pool): Promise<unknown[]> => {
  const result = await db.query(
    `SELECT
      id,
      name,
      status_type,
      description,
      color,
      sort_order,
      is_active,
      can_transition_to,
      requires_reason,
      created_at,
      updated_at
    FROM case_statuses
    WHERE is_active = true
    ORDER BY sort_order`
  );
  return result.rows;
};
