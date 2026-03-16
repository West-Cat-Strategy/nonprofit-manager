import pool from '@config/database';
import { sendMail } from '@services/emailService';
import { logger } from '@config/logger';
import {
  resolvePortalCaseSelection,
  ensureCaseIsPortalAccessible,
} from '@services/portalPointpersonService';
import {
  publishPortalThreadUpdated,
  type PortalRealtimeMessageSnapshot,
  type PortalRealtimeThreadSnapshot,
} from '@services/portalRealtimeService';

export interface PortalThreadSummary {
  id: string;
  contact_id: string;
  case_id: string | null;
  portal_user_id: string;
  pointperson_user_id: string | null;
  subject: string | null;
  status: 'open' | 'closed' | 'archived';
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
  case_number: string | null;
  case_title: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  pointperson_email: string | null;
  portal_email: string | null;
  unread_count: number;
}

export interface PortalMessageEntry {
  id: string;
  thread_id: string;
  sender_type: 'portal' | 'staff' | 'system';
  sender_portal_user_id: string | null;
  sender_user_id: string | null;
  message_text: string;
  is_internal: boolean;
  metadata: Record<string, unknown> | null;
  client_message_id: string | null;
  created_at: string;
  read_by_portal_at: string | null;
  read_by_staff_at: string | null;
  sender_display_name: string | null;
}

export interface ThreadWithMessages {
  thread: PortalThreadSummary;
  messages: PortalMessageEntry[];
}

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

const notifyEmail = async (args: {
  to: string | null | undefined;
  subject: string;
  body: string;
}): Promise<void> => {
  if (!args.to) {
    return;
  }

  try {
    await sendMail({
      to: args.to,
      subject: args.subject,
      text: args.body,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;white-space:pre-wrap">${args.body}</div>`,
    });
  } catch (error) {
    logger.warn('Portal message email notification failed', { error, to: args.to });
  }
};

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

const getThreadById = async (threadId: string): Promise<PortalThreadSummary | null> => {
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

const buildRealtimeThreadSnapshot = async (
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

const toRealtimeMessageSnapshot = (
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

const getThreadMessages = async (
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

const getPortalMessageByClientMessageId = async (input: {
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

const ensureThreadForPortal = async (
  client: { query: typeof pool.query },
  portalUserId: string,
  threadId: string
): Promise<PortalThreadSummary> => {
  const result = await client.query(
    `${THREAD_BASE_SELECT}
     WHERE t.id = $1 AND t.portal_user_id = $2`,
    [threadId, portalUserId]
  );

  if (!result.rows[0]) {
    throw new Error('Thread not found');
  }

  return {
    ...(result.rows[0] as PortalThreadSummary),
    unread_count: 0,
  };
};

export const createPortalThreadWithMessage = async (input: {
  portalUserId: string;
  contactId: string;
  caseId?: string | null;
  subject?: string | null;
  messageText: string;
}): Promise<ThreadWithMessages> => {
  const selection = await resolvePortalCaseSelection(input.contactId, input.caseId);
  const selectedCase = selection.selected_case;

  if (!selectedCase) {
    throw new Error('No active case available for messaging');
  }

  if (!selectedCase.assigned_to) {
    throw new Error('Selected case does not have an assigned pointperson');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const threadResult = await client.query(
      `INSERT INTO portal_threads (
        contact_id,
        case_id,
        portal_user_id,
        pointperson_user_id,
        subject,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'open')
      RETURNING *`,
      [
        input.contactId,
        selectedCase.case_id,
        input.portalUserId,
        selectedCase.assigned_to,
        input.subject?.trim() || null,
      ]
    );

    const threadId = threadResult.rows[0].id as string;

    await client.query(
      `INSERT INTO portal_messages (
        thread_id,
        sender_type,
        sender_portal_user_id,
        message_text,
        read_by_portal_at
      ) VALUES ($1, 'portal', $2, $3, NOW())`,
      [threadId, input.portalUserId, input.messageText.trim()]
    );

    await client.query('COMMIT');

    const thread = await getThreadById(threadId);
    const messages = await getThreadMessages(threadId, false);

    if (!thread) {
      throw new Error('Thread creation failed');
    }

    await notifyEmail({
      to: thread.pointperson_email,
      subject: `New client portal message${thread.case_number ? ` (${thread.case_number})` : ''}`,
      body: [
        'A client sent a new portal message.',
        thread.case_number ? `Case: ${thread.case_number}` : '',
        thread.case_title ? `Title: ${thread.case_title}` : '',
        '',
        input.messageText.trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    });

    publishPortalThreadUpdated({
      entityId: thread.id,
      caseId: thread.case_id,
      status: thread.status,
      actorType: 'portal',
      source: 'portal.thread.create',
      contactId: thread.contact_id,
      action: 'message.created',
      thread: await buildRealtimeThreadSnapshot(thread),
      message: messages[0] ? toRealtimeMessageSnapshot(messages[0]) : null,
    });

    return { thread, messages };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const addPortalMessage = async (input: {
  portalUserId: string;
  threadId: string;
  messageText: string;
  clientMessageId?: string;
}): Promise<PortalMessageEntry> => {
  if (input.clientMessageId) {
    const existing = await getPortalMessageByClientMessageId({
      threadId: input.threadId,
      clientMessageId: input.clientMessageId,
      senderPortalUserId: input.portalUserId,
      includeInternal: false,
    });

    if (existing) {
      return existing;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const thread = await ensureThreadForPortal(client, input.portalUserId, input.threadId);
    if (thread.status !== 'open') {
      throw new Error('Thread is not open');
    }

    const messageResult = await client.query(
      `${MESSAGE_SELECT}
       WHERE 1 = 0`
    );
    void messageResult; // keeps select string validated by TS compiler.

    const inserted = await client.query(
      `INSERT INTO portal_messages (
        thread_id,
        sender_type,
        sender_portal_user_id,
        message_text,
        client_message_id,
        read_by_portal_at
      ) VALUES ($1, 'portal', $2, $3, $4, NOW())
      RETURNING id`,
      [input.threadId, input.portalUserId, input.messageText.trim(), input.clientMessageId || null]
    );

    await client.query('COMMIT');

    const messages = await getThreadMessages(input.threadId, false);
    const created = messages.find((message) => message.id === inserted.rows[0].id);

    if (!created) {
      throw new Error('Message creation failed');
    }

    await notifyEmail({
      to: thread.pointperson_email,
      subject: `Client portal reply${thread.case_number ? ` (${thread.case_number})` : ''}`,
      body: input.messageText.trim(),
    });

    publishPortalThreadUpdated({
      entityId: thread.id,
      caseId: thread.case_id,
      status: thread.status,
      actorType: 'portal',
      source: 'portal.thread.reply',
      contactId: thread.contact_id,
      action: 'message.created',
      thread: await buildRealtimeThreadSnapshot(thread),
      message: toRealtimeMessageSnapshot(created),
      clientMessageId: created.client_message_id,
    });

    return created;
  } catch (error) {
    await client.query('ROLLBACK');

    if (input.clientMessageId && error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23505') {
      const existing = await getPortalMessageByClientMessageId({
        threadId: input.threadId,
        clientMessageId: input.clientMessageId,
        senderPortalUserId: input.portalUserId,
        includeInternal: false,
      });

      if (existing) {
        return existing;
      }
    }

    throw error;
  } finally {
    client.release();
  }
};

export const addStaffMessage = async (input: {
  threadId: string;
  senderUserId: string;
  messageText: string;
  isInternal?: boolean;
  clientMessageId?: string;
}): Promise<PortalMessageEntry> => {
  const internal = Boolean(input.isInternal);

  if (input.clientMessageId) {
    const existing = await getPortalMessageByClientMessageId({
      threadId: input.threadId,
      clientMessageId: input.clientMessageId,
      senderUserId: input.senderUserId,
      includeInternal: true,
    });

    if (existing) {
      return existing;
    }
  }

  let insertResult;

  try {
    insertResult = await pool.query(
      `INSERT INTO portal_messages (
        thread_id,
        sender_type,
        sender_user_id,
        message_text,
        is_internal,
        client_message_id,
        read_by_staff_at
      ) VALUES ($1, 'staff', $2, $3, $4, $5, NOW())
      RETURNING id`,
      [
        input.threadId,
        input.senderUserId,
        input.messageText.trim(),
        internal,
        input.clientMessageId || null,
      ]
    );
  } catch (error) {
    if (input.clientMessageId && error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23505') {
      const existing = await getPortalMessageByClientMessageId({
        threadId: input.threadId,
        clientMessageId: input.clientMessageId,
        senderUserId: input.senderUserId,
        includeInternal: true,
      });

      if (existing) {
        return existing;
      }
    }

    throw error;
  }

  const thread = await getThreadById(input.threadId);
  const messages = await getThreadMessages(input.threadId, true);
  const message = messages.find((entry) => entry.id === insertResult.rows[0].id);

  if (!message) {
    throw new Error('Message creation failed');
  }

  if (!internal && thread) {
    await notifyEmail({
      to: thread.portal_email,
      subject: `New staff reply${thread.case_number ? ` (${thread.case_number})` : ''}`,
      body: input.messageText.trim(),
    });
  }

  if (thread) {
    publishPortalThreadUpdated({
      entityId: thread.id,
      caseId: thread.case_id,
      status: thread.status,
      actorType: 'staff',
      source: internal ? 'admin.thread.internal_note' : 'admin.thread.reply',
      contactId: thread.contact_id,
      action: 'message.created',
      thread: await buildRealtimeThreadSnapshot(thread),
      message: toRealtimeMessageSnapshot(message),
      clientMessageId: message.client_message_id,
    });
  }

  return message;
};

export const markPortalThreadRead = async (
  portalUserId: string,
  threadId: string
): Promise<number> => {
  const thread = await getThreadById(threadId);
  if (!thread || thread.portal_user_id !== portalUserId) {
    return 0;
  }

  const result = await pool.query(
    `UPDATE portal_messages
     SET read_by_portal_at = NOW()
     WHERE thread_id = $1
       AND sender_type IN ('staff', 'system')
       AND is_internal = false
       AND read_by_portal_at IS NULL`,
    [threadId]
  );

  const updated = result.rowCount || 0;

  if (updated > 0) {
    publishPortalThreadUpdated({
      entityId: thread.id,
      caseId: thread.case_id,
      status: thread.status,
      actorType: 'portal',
      source: 'portal.thread.read',
      contactId: thread.contact_id,
      action: 'thread.read',
      thread: await buildRealtimeThreadSnapshot(thread),
    });
  }

  return updated;
};

export const markStaffThreadRead = async (threadId: string): Promise<number> => {
  const result = await pool.query(
    `UPDATE portal_messages
     SET read_by_staff_at = NOW()
     WHERE thread_id = $1
       AND sender_type = 'portal'
       AND read_by_staff_at IS NULL`,
    [threadId]
  );

  const updated = result.rowCount || 0;
  if (updated > 0) {
    const thread = await getThreadById(threadId);
    if (thread) {
      publishPortalThreadUpdated({
        entityId: thread.id,
        caseId: thread.case_id,
        status: thread.status,
        actorType: 'staff',
        source: 'admin.thread.read',
        contactId: thread.contact_id,
        action: 'thread.read',
        thread: await buildRealtimeThreadSnapshot(thread),
      });
    }
  }

  return updated;
};

export const updateThread = async (input: {
  threadId: string;
  status?: 'open' | 'closed' | 'archived';
  pointpersonUserId?: string | null;
  caseId?: string | null;
  subject?: string | null;
  actorType?: 'portal' | 'staff' | 'system';
  closedBy?: string | null;
}): Promise<PortalThreadSummary | null> => {
  const fields: string[] = [];
  const values: Array<string | null> = [];

  if (input.status) {
    values.push(input.status);
    fields.push(`status = $${values.length}`);

    if (input.status === 'closed') {
      fields.push(`closed_at = NOW()`);
      values.push(input.closedBy || null);
      fields.push(`closed_by = $${values.length}`);
    }

    if (input.status === 'open') {
      fields.push(`closed_at = NULL`);
      fields.push(`closed_by = NULL`);
    }
  }

  if (input.pointpersonUserId !== undefined) {
    values.push(input.pointpersonUserId);
    fields.push(`pointperson_user_id = $${values.length}`);
  }

  if (input.caseId !== undefined) {
    values.push(input.caseId);
    fields.push(`case_id = $${values.length}`);
  }

  if (input.subject !== undefined) {
    values.push(input.subject?.trim() || null);
    fields.push(`subject = $${values.length}`);
  }

  if (fields.length === 0) {
    return getThreadById(input.threadId);
  }

  fields.push('updated_at = NOW()');
  values.push(input.threadId);

  const result = await pool.query(
    `UPDATE portal_threads
     SET ${fields.join(', ')}
     WHERE id = $${values.length}
     RETURNING id`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  const updatedThread = await getThreadById(input.threadId);
  if (!updatedThread) {
    return null;
  }

  publishPortalThreadUpdated({
    entityId: updatedThread.id,
    caseId: updatedThread.case_id,
    status: updatedThread.status,
    actorType: input.actorType || 'staff',
    source: input.status ? 'thread.status.update' : 'thread.update',
    contactId: updatedThread.contact_id,
    action: input.status ? 'thread.status.updated' : 'thread.updated',
    thread: await buildRealtimeThreadSnapshot(updatedThread),
  });

  return updatedThread;
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

export const ensurePortalCaseMessageable = async (
  contactId: string,
  caseId: string
): Promise<void> => {
  const context = await ensureCaseIsPortalAccessible(contactId, caseId);
  if (!context) {
    throw new Error('Case not found for portal contact');
  }
  if (!context.is_messageable) {
    throw new Error('Selected case does not have an assigned pointperson');
  }
};
