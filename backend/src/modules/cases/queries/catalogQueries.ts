import { Pool } from 'pg';
import type { CaseFilter, CaseSummary, CaseTimelineEvent, CaseWithDetails } from '@app-types/case';
import { buildCaseProvenance } from '../utils/importProvenance';
import {
  decodeTimelineCursor,
  DEFAULT_TIMELINE_LIMIT,
  encodeTimelineCursor,
  MAX_TIMELINE_LIMIT,
  requireCaseOwnership,
} from './shared';
import { getRequestContext } from '@config/requestContext';

const CASE_COLUMNS = `
  c.id,
  c.case_number,
  c.contact_id,
  c.account_id,
  c.case_type_id,
  c.outcome,
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
  c.modified_by,
  COALESCE((
    SELECT ARRAY_AGG(cta.case_type_id ORDER BY cta.is_primary DESC, cta.sort_order ASC, cta.created_at ASC, cta.id ASC)
    FROM case_type_assignments cta
    WHERE cta.case_id = c.id
  ), CASE WHEN c.case_type_id IS NOT NULL THEN ARRAY[c.case_type_id]::uuid[] ELSE ARRAY[]::uuid[] END) AS case_type_ids,
  COALESCE((
    SELECT ARRAY_AGG(ct.name ORDER BY cta.is_primary DESC, cta.sort_order ASC, cta.created_at ASC, cta.id ASC)
    FROM case_type_assignments cta
    INNER JOIN case_types ct ON ct.id = cta.case_type_id
    WHERE cta.case_id = c.id
  ), CASE
    WHEN c.case_type_id IS NOT NULL THEN ARRAY[
      COALESCE(
        (
          SELECT ct_scalar.name
          FROM case_types ct_scalar
          WHERE ct_scalar.id = c.case_type_id
          LIMIT 1
        ),
        c.case_type_id::text
      )
    ]::text[]
    ELSE ARRAY[]::text[]
  END) AS case_type_names,
  COALESCE((
    SELECT ARRAY_AGG(coa.outcome_value ORDER BY coa.is_primary DESC, coa.sort_order ASC, coa.created_at ASC, coa.id ASC)
    FROM case_outcome_assignments coa
    WHERE coa.case_id = c.id
  ), CASE
    WHEN c.outcome IS NOT NULL AND btrim(c.outcome) <> '' THEN ARRAY[c.outcome]::text[]
    ELSE ARRAY[]::text[]
  END) AS case_outcome_values
`;

const CASE_SEARCH_SQL =
  `coalesce(nullif(c.case_number, ''), '')`
  + ` || CASE WHEN nullif(c.title, '') IS NOT NULL THEN ' ' || c.title ELSE '' END`
  + ` || CASE WHEN nullif(c.description, '') IS NOT NULL THEN ' ' || c.description ELSE '' END`;

export const getCasesQuery = async (
  db: Pool,
  filter: CaseFilter = {}
): Promise<{ cases: CaseWithDetails[]; total: number }> => {
  const filters: string[] = [];
  const params: unknown[] = [];
  let needsStatusJoin = false;
  const organizationId = filter.organizationId || getRequestContext()?.organizationId || getRequestContext()?.accountId || getRequestContext()?.tenantId;

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
    params.push(filter.case_type_id, filter.case_type_id);
    filters.push(`(c.case_type_id = $${params.length - 1} OR EXISTS (
      SELECT 1
      FROM case_type_assignments cta
      WHERE cta.case_id = c.id
        AND cta.case_type_id = $${params.length}
    ))`);
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

  if (filter.imported_only) {
    filters.push(`(
      COALESCE(c.custom_data ? 'import_provenance', false)
      OR COALESCE(c.custom_data ? 'cluster_id', false)
    )`);
  }

  if (filter.quick_filter) {
    if (filter.quick_filter === 'active') {
      needsStatusJoin = true;
      filters.push(`filter_cs.status_type NOT IN ('closed', 'cancelled')`);
    }

    if (filter.quick_filter === 'urgent') {
      filters.push(`(c.is_urgent = true OR c.priority IN ('urgent', 'critical'))`);
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

  if (organizationId) {
    params.push(organizationId);
    filters.push(`COALESCE(c.account_id, con.account_id) = $${params.length}`);
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
      LEFT JOIN contacts con ON c.contact_id = con.id
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
  const cases = rows.map(({ total_count: _totalCount, ...row }) => ({
    ...row,
    provenance: buildCaseProvenance(row.custom_data),
  })) as CaseWithDetails[];
  return { cases, total };
};

export const getCaseByIdQuery = async (
  db: Pool,
  caseId: string,
  organizationId?: string
): Promise<CaseWithDetails | null> => {
  const resolvedOrganizationId =
    organizationId || getRequestContext()?.organizationId || getRequestContext()?.accountId || getRequestContext()?.tenantId;
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
      AND (
        $2::uuid IS NULL
        OR COALESCE(c.account_id, con.account_id) = $2::uuid
      )
  `,
    [caseId, resolvedOrganizationId || null]
  );

  const row = result.rows[0] as (CaseWithDetails & { custom_data?: unknown }) | undefined;
  if (!row) {
    return null;
  }

  return {
    ...row,
    provenance: buildCaseProvenance(row.custom_data),
  } as CaseWithDetails;
};

export const getCaseTimelineQuery = async (
  db: Pool,
  caseId: string,
  options?: { limit?: number; cursor?: string },
  organizationId?: string
): Promise<{ items: CaseTimelineEvent[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> => {
  await requireCaseOwnership(db, caseId, organizationId);
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
  const resolvedOrganizationId =
    organizationId || getRequestContext()?.organizationId || getRequestContext()?.accountId || getRequestContext()?.tenantId;
  const scopeParams: string[] = [];
  const scopeValues: unknown[] = [];
  if (resolvedOrganizationId) {
    scopeValues.push(resolvedOrganizationId);
    scopeParams.push(`COALESCE(c.account_id, con.account_id) = $${scopeValues.length}`);
  }
  const scopeClause = scopeParams.length > 0 ? `WHERE ${scopeParams.join(' AND ')}` : '';

  const result = await db.query(
    `
    WITH scoped_cases AS (
      SELECT
        c.id,
        c.case_type_id,
        c.outcome,
        c.priority,
        c.is_urgent,
        c.due_date,
        c.opened_date,
        c.closed_date,
        c.intake_date,
        c.status_id,
        c.assigned_to,
        cs.status_type
      FROM cases c
      LEFT JOIN contacts con ON con.id = c.contact_id
      LEFT JOIN case_statuses cs ON c.status_id = cs.id
      ${scopeClause}
    ),
    summary_stats AS (
      SELECT
        COUNT(*) AS total_cases,
        COUNT(*) FILTER (WHERE status_type IN ('intake', 'active', 'review')) AS open_cases,
        COUNT(*) FILTER (WHERE status_type IN ('closed', 'cancelled')) AS closed_cases,
        COUNT(*) FILTER (WHERE priority = 'low') AS priority_low,
        COUNT(*) FILTER (WHERE priority = 'medium') AS priority_medium,
        COUNT(*) FILTER (WHERE priority = 'high') AS priority_high,
        COUNT(*) FILTER (WHERE is_urgent = true OR priority IN ('urgent', 'critical')) AS priority_urgent,
        COUNT(*) FILTER (WHERE status_type = 'intake') AS status_intake,
        COUNT(*) FILTER (WHERE status_type = 'active') AS status_active,
        COUNT(*) FILTER (WHERE status_type = 'review') AS status_review,
        COUNT(*) FILTER (WHERE status_type = 'closed') AS status_closed,
        COUNT(*) FILTER (WHERE status_type = 'cancelled') AS status_cancelled,
        COUNT(*) FILTER (WHERE due_date <= CURRENT_DATE + INTERVAL '7 days' AND due_date >= CURRENT_DATE) AS due_this_week,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status_type NOT IN ('closed', 'cancelled')) AS overdue,
        COUNT(*) FILTER (WHERE assigned_to IS NULL AND status_type NOT IN ('closed', 'cancelled')) AS unassigned,
        AVG(EXTRACT(EPOCH FROM (COALESCE(closed_date, NOW()) - intake_date)) / 86400)
          FILTER (WHERE status_type IN ('closed', 'cancelled')) AS avg_duration
      FROM scoped_cases
    ),
    assigned_case_types AS (
      SELECT ct.name AS case_type_name, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      JOIN case_type_assignments cta ON cta.case_id = sc.id
      JOIN case_types ct ON ct.id = cta.case_type_id
      GROUP BY ct.name
    ),
    legacy_case_types AS (
      SELECT COALESCE(ct.name, sc.case_type_id::text) AS case_type_name, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      LEFT JOIN case_types ct ON ct.id = sc.case_type_id
      WHERE sc.case_type_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM case_type_assignments cta
          WHERE cta.case_id = sc.id
        )
      GROUP BY COALESCE(ct.name, sc.case_type_id::text)
    ),
    assigned_case_outcomes AS (
      SELECT coa.outcome_value AS case_outcome_value, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      JOIN case_outcome_assignments coa ON coa.case_id = sc.id
      GROUP BY coa.outcome_value
    ),
    legacy_case_outcomes AS (
      SELECT sc.outcome AS case_outcome_value, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      WHERE sc.outcome IS NOT NULL
        AND btrim(sc.outcome) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM case_outcome_assignments coa
          WHERE coa.case_id = sc.id
        )
      GROUP BY sc.outcome
    )
    SELECT
      total_cases,
      open_cases,
      closed_cases,
      priority_low,
      priority_medium,
      priority_high,
      priority_urgent,
      status_intake,
      status_active,
      status_review,
      status_closed,
      status_cancelled,
      due_this_week,
      overdue,
      unassigned,
      avg_duration
    FROM summary_stats
  `,
    scopeValues
  );

  const typeResult = await db.query(
    `
    WITH scoped_cases AS (
      SELECT
        c.id,
        c.case_type_id,
        c.outcome,
        c.priority,
        c.is_urgent,
        c.due_date,
        c.opened_date,
        c.closed_date,
        c.intake_date,
        c.status_id,
        c.assigned_to,
        cs.status_type
      FROM cases c
      LEFT JOIN contacts con ON con.id = c.contact_id
      LEFT JOIN case_statuses cs ON c.status_id = cs.id
      ${scopeClause}
    ),
    assigned_case_types AS (
      SELECT ct.name AS case_type_name, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      JOIN case_type_assignments cta ON cta.case_id = sc.id
      JOIN case_types ct ON ct.id = cta.case_type_id
      GROUP BY ct.name
    ),
    legacy_case_types AS (
      SELECT COALESCE(ct.name, sc.case_type_id::text) AS case_type_name, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      LEFT JOIN case_types ct ON ct.id = sc.case_type_id
      WHERE sc.case_type_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM case_type_assignments cta
          WHERE cta.case_id = sc.id
        )
      GROUP BY COALESCE(ct.name, sc.case_type_id::text)
    )
    SELECT case_type_name, SUM(count)::int AS count
    FROM (
      SELECT * FROM assigned_case_types
      UNION ALL
      SELECT * FROM legacy_case_types
    ) type_counts
    GROUP BY case_type_name
    ORDER BY count DESC, case_type_name ASC
  `,
    scopeValues
  );

  const outcomeResult = await db.query(
    `
    WITH scoped_cases AS (
      SELECT
        c.id,
        c.case_type_id,
        c.outcome,
        c.priority,
        c.is_urgent,
        c.due_date,
        c.opened_date,
        c.closed_date,
        c.intake_date,
        c.status_id,
        c.assigned_to,
        cs.status_type
      FROM cases c
      LEFT JOIN contacts con ON con.id = c.contact_id
      LEFT JOIN case_statuses cs ON c.status_id = cs.id
      ${scopeClause}
    ),
    assigned_case_outcomes AS (
      SELECT coa.outcome_value AS case_outcome_value, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      JOIN case_outcome_assignments coa ON coa.case_id = sc.id
      GROUP BY coa.outcome_value
    ),
    legacy_case_outcomes AS (
      SELECT sc.outcome AS case_outcome_value, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      WHERE sc.outcome IS NOT NULL
        AND btrim(sc.outcome) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM case_outcome_assignments coa
          WHERE coa.case_id = sc.id
        )
      GROUP BY sc.outcome
    )
    SELECT case_outcome_value, SUM(count)::int AS count
    FROM (
      SELECT * FROM assigned_case_outcomes
      UNION ALL
      SELECT * FROM legacy_case_outcomes
    ) outcome_counts
    GROUP BY case_outcome_value
    ORDER BY count DESC, case_outcome_value ASC
  `,
    scopeValues
  );

  const byCaseType: Record<string, number> = {};
  for (const row of typeResult.rows) {
    const caseTypeName = row.case_type_name ?? row.name;
    if (!caseTypeName) {
      continue;
    }
    byCaseType[caseTypeName] = parseInt(row.count, 10);
  }

  const byCaseOutcome: Record<string, number> = {};
  for (const row of outcomeResult.rows) {
    byCaseOutcome[row.case_outcome_value] = parseInt(row.count, 10);
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
    by_case_outcome: byCaseOutcome,
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
