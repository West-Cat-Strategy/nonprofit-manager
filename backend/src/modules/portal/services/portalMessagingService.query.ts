import pool from '@config/database';
import type { PortalMessageEntry, PortalThreadSummary, ThreadWithMessages } from './portalMessagingService.types';
import type {
  PortalRealtimeMessageSnapshot,
  PortalRealtimeThreadSnapshot,
} from '@services/portalRealtimeService';

const THREAD_BASE_SELECT = `
  SELECT
    t.id,
    t.contact_id,
    t.case_id,
    t.portal_user_id,
    t.pointperson_user_id,
    t.subject,
    t.status,
    t.last_message_at,
    t.last_message_preview,
    t.created_at,
    t.updated_at,
    t.closed_at,
    t.closed_by,
    c.case_number,
    c.title AS case_title,
    u.first_name AS pointperson_first_name,
    u.last_name AS pointperson_last_name,
    u.email AS pointperson_email,
    pu.email AS portal_email
  FROM portal_threads t
  LEFT JOIN cases c ON c.id = t.case_id
  LEFT JOIN users u ON u.id = t.pointperson_user_id
  LEFT JOIN portal_users pu ON pu.id = t.portal_user_id
`;

const MESSAGE_SELECT = `
  SELECT
    pm.id,
    pm.thread_id,
    pm.sender_type,
    pm.sender_portal_user_id,
    pm.sender_user_id,
    pm.message_text,
    pm.is_internal,
    pm.metadata,
    pm.client_message_id,
    pm.created_at,
    pm.read_by_portal_at,
    pm.read_by_staff_at,
    CASE
      WHEN pm.sender_type = 'portal' THEN TRIM(CONCAT(ct.first_name, ' ', ct.last_name))
      WHEN pm.sender_type = 'staff' THEN TRIM(CONCAT(u.first_name, ' ', u.last_name))
      ELSE 'System'
    END AS sender_display_name
  FROM portal_messages pm
  LEFT JOIN portal_users pu ON pu.id = pm.sender_portal_user_id
  LEFT JOIN contacts ct ON ct.id = pu.contact_id
  LEFT JOIN users u ON u.id = pm.sender_user_id
`;

const mapPortalMessageRow = (row: Record<string, unknown>): PortalMessageEntry => ({
  id: String(row.id),
  thread_id: String(row.thread_id),
  sender_type: row.sender_type as PortalMessageEntry['sender_type'],
  sender_portal_user_id: row.sender_portal_user_id ? String(row.sender_portal_user_id) : null,
  sender_user_id: row.sender_user_id ? String(row.sender_user_id) : null,
  message_text: String(row.message_text),
  is_internal: Boolean(row.is_internal),
  metadata: (row.metadata as Record<string, unknown> | null) || null,
  client_message_id: row.client_message_id ? String(row.client_message_id) : null,
  created_at: String(row.created_at),
  read_by_portal_at: row.read_by_portal_at ? String(row.read_by_portal_at) : null,
  read_by_staff_at: row.read_by_staff_at ? String(row.read_by_staff_at) : null,
  sender_display_name: row.sender_display_name ? String(row.sender_display_name) : null,
});

export const getThreadById = async (threadId: string): Promise<PortalThreadSummary | null> => {
  const result = await pool.query(
    `${THREAD_BASE_SELECT}
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM portal_messages pm
       WHERE pm.thread_id = t.id
         AND pm.sender_type IN ('staff', 'system')
         AND pm.read_by_portal_at IS NULL
         AND pm.is_internal = false
     ) unread ON true
     WHERE t.id = $1`,
    [threadId]
  );

  if (!result.rows[0]) {
    return null;
  }

  return {
    ...(result.rows[0] as PortalThreadSummary),
    unread_count: Number(result.rows[0].unread_count || 0),
  };
};

const getThreadUnreadCounts = async (
  threadId: string
): Promise<{ portal_unread_count: number; staff_unread_count: number }> => {
  const result = await pool.query(
    `SELECT
       COALESCE((
         SELECT COUNT(*)::int
         FROM portal_messages pm
         WHERE pm.thread_id = $1
           AND pm.sender_type IN ('staff', 'system')
           AND pm.is_internal = false
           AND pm.read_by_portal_at IS NULL
       ), 0) AS portal_unread_count,
       COALESCE((
         SELECT COUNT(*)::int
         FROM portal_messages pm
         WHERE pm.thread_id = $1
           AND pm.sender_type = 'portal'
           AND pm.read_by_staff_at IS NULL
       ), 0) AS staff_unread_count`,
    [threadId]
  );

  return {
    portal_unread_count: Number(result.rows[0]?.portal_unread_count || 0),
    staff_unread_count: Number(result.rows[0]?.staff_unread_count || 0),
  };
};

export const buildRealtimeThreadSnapshot = async (
  thread: PortalThreadSummary
): Promise<PortalRealtimeThreadSnapshot> => {
  const unread = await getThreadUnreadCounts(thread.id);
  return {
    id: thread.id,
    contact_id: thread.contact_id,
    case_id: thread.case_id,
    subject: thread.subject,
    status: thread.status,
    last_message_at: thread.last_message_at,
    last_message_preview: thread.last_message_preview,
    case_number: thread.case_number,
    case_title: thread.case_title,
    pointperson_user_id: thread.pointperson_user_id,
    pointperson_first_name: thread.pointperson_first_name,
    pointperson_last_name: thread.pointperson_last_name,
    portal_email: thread.portal_email,
    portal_unread_count: unread.portal_unread_count,
    staff_unread_count: unread.staff_unread_count,
  };
};

export const toRealtimeMessageSnapshot = (
  message: PortalMessageEntry
): PortalRealtimeMessageSnapshot => ({
  id: message.id,
  thread_id: message.thread_id,
  sender_type: message.sender_type,
  sender_portal_user_id: message.sender_portal_user_id,
  sender_user_id: message.sender_user_id,
  sender_display_name: message.sender_display_name,
  message_text: message.message_text,
  is_internal: message.is_internal,
  client_message_id: message.client_message_id,
  created_at: message.created_at,
  read_by_portal_at: message.read_by_portal_at,
  read_by_staff_at: message.read_by_staff_at,
});

export const listPortalThreads = async (
  portalUserId: string,
  filters?: {
    status?: 'open' | 'closed' | 'archived';
    caseId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<PortalThreadSummary[]> => {
  const conditions: string[] = ['t.portal_user_id = $1'];
  const values: Array<string | number> = [portalUserId];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`t.status = $${values.length}`);
  }

  if (filters?.caseId) {
    values.push(filters.caseId);
    conditions.push(`t.case_id = $${values.length}`);
  }

  if (filters?.search) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(COALESCE(t.subject, '') ILIKE $${values.length}
        OR COALESCE(c.case_number, '') ILIKE $${values.length}
        OR COALESCE(c.title, '') ILIKE $${values.length}
        OR COALESCE(t.last_message_preview, '') ILIKE $${values.length}
        OR COALESCE(u.first_name, '') ILIKE $${values.length}
        OR COALESCE(u.last_name, '') ILIKE $${values.length})`
    );
  }

  let paginationSql = '';
  if (typeof filters?.limit === 'number') {
    values.push(filters.limit);
    paginationSql += ` LIMIT $${values.length}`;
  }
  if (typeof filters?.offset === 'number' && filters.offset > 0) {
    values.push(filters.offset);
    paginationSql += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(
    `${THREAD_BASE_SELECT}
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM portal_messages pm
       WHERE pm.thread_id = t.id
         AND pm.sender_type IN ('staff', 'system')
         AND pm.read_by_portal_at IS NULL
         AND pm.is_internal = false
     ) unread ON true
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.last_message_at DESC${paginationSql}`,
    values
  );

  return result.rows.map((row) => ({
    ...row,
    unread_count: Number(row.unread_count || 0),
  })) as PortalThreadSummary[];
};

export const listStaffThreads = async (filters?: {
  status?: 'open' | 'closed' | 'archived';
  caseId?: string;
  pointpersonUserId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PortalThreadSummary[]> => {
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`t.status = $${values.length}`);
  }

  if (filters?.caseId) {
    values.push(filters.caseId);
    conditions.push(`t.case_id = $${values.length}`);
  }

  if (filters?.pointpersonUserId) {
    values.push(filters.pointpersonUserId);
    conditions.push(`t.pointperson_user_id = $${values.length}`);
  }

  if (filters?.search) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(COALESCE(t.subject, '') ILIKE $${values.length}
        OR COALESCE(c.case_number, '') ILIKE $${values.length}
        OR COALESCE(c.title, '') ILIKE $${values.length}
        OR COALESCE(t.last_message_preview, '') ILIKE $${values.length}
        OR COALESCE(pu.email, '') ILIKE $${values.length}
        OR COALESCE(u.first_name, '') ILIKE $${values.length}
        OR COALESCE(u.last_name, '') ILIKE $${values.length})`
    );
  }

  let paginationSql = '';
  if (typeof filters?.limit === 'number') {
    values.push(filters.limit);
    paginationSql += ` LIMIT $${values.length}`;
  }
  if (typeof filters?.offset === 'number' && filters.offset > 0) {
    values.push(filters.offset);
    paginationSql += ` OFFSET $${values.length}`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `${THREAD_BASE_SELECT}
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM portal_messages pm
       WHERE pm.thread_id = t.id
         AND pm.sender_type = 'portal'
         AND pm.read_by_staff_at IS NULL
     ) unread ON true
     ${whereClause}
     ORDER BY t.last_message_at DESC${paginationSql}`,
    values
  );

  return result.rows.map((row) => ({
    ...row,
    unread_count: Number(row.unread_count || 0),
  })) as PortalThreadSummary[];
};

export const getThreadMessages = async (
  threadId: string,
  includeInternal: boolean
): Promise<PortalMessageEntry[]> => {
  const result = await pool.query(
    `${MESSAGE_SELECT}
     WHERE pm.thread_id = $1
       ${includeInternal ? '' : 'AND pm.is_internal = false'}
     ORDER BY pm.created_at ASC`,
    [threadId]
  );

  return result.rows.map((row) => mapPortalMessageRow(row));
};

export const getPortalMessageByClientMessageId = async (input: {
  threadId: string;
  clientMessageId: string;
  senderUserId?: string | null;
  senderPortalUserId?: string | null;
  includeInternal?: boolean;
}): Promise<PortalMessageEntry | null> => {
  const conditions = [
    'pm.thread_id = $1',
    'pm.client_message_id = $2',
  ];
  const values: Array<string | boolean> = [input.threadId, input.clientMessageId];

  if (input.senderUserId) {
    values.push(input.senderUserId);
    conditions.push(`pm.sender_user_id = $${values.length}`);
  }

  if (input.senderPortalUserId) {
    values.push(input.senderPortalUserId);
    conditions.push(`pm.sender_portal_user_id = $${values.length}`);
  }

  if (!input.includeInternal) {
    conditions.push('pm.is_internal = false');
  }

  const result = await pool.query(
    `${MESSAGE_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY pm.created_at DESC
     LIMIT 1`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapPortalMessageRow(result.rows[0]);
};

export const getPortalThread = async (
  portalUserId: string,
  threadId: string
): Promise<ThreadWithMessages | null> => {
  const thread = await getThreadById(threadId);
  if (!thread || thread.portal_user_id !== portalUserId) {
    return null;
  }

  const messages = await getThreadMessages(threadId, false);
  return { thread, messages };
};

export const getStaffThread = async (threadId: string): Promise<ThreadWithMessages | null> => {
  const thread = await getThreadById(threadId);
  if (!thread) {
    return null;
  }

  const messages = await getThreadMessages(threadId, true);
  return { thread, messages };
};

export const listCaseThreads = async (caseId: string): Promise<PortalThreadSummary[]> => {
  const result = await pool.query(
    `${THREAD_BASE_SELECT}
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM portal_messages pm
       WHERE pm.thread_id = t.id
         AND pm.sender_type = 'portal'
         AND pm.read_by_staff_at IS NULL
     ) unread ON true
     WHERE t.case_id = $1
     ORDER BY t.last_message_at DESC`,
    [caseId]
  );

  return result.rows.map((row) => ({
    ...row,
    unread_count: Number(row.unread_count || 0),
  })) as PortalThreadSummary[];
};

export { MESSAGE_SELECT, THREAD_BASE_SELECT, mapPortalMessageRow };
