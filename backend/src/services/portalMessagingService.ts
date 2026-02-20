import pool from '@config/database';
import { sendMail } from '@services/emailService';
import { logger } from '@config/logger';
import {
  resolvePortalCaseSelection,
  ensureCaseIsPortalAccessible,
} from '@services/portalPointpersonService';

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

export const listPortalThreads = async (portalUserId: string): Promise<PortalThreadSummary[]> => {
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
     WHERE t.portal_user_id = $1
     ORDER BY t.last_message_at DESC`,
    [portalUserId]
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
}): Promise<PortalThreadSummary[]> => {
  const conditions: string[] = [];
  const values: Array<string> = [];

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
     ORDER BY t.last_message_at DESC`,
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

  return result.rows as PortalMessageEntry[];
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
}): Promise<PortalMessageEntry> => {
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
        read_by_portal_at
      ) VALUES ($1, 'portal', $2, $3, NOW())
      RETURNING id`,
      [input.threadId, input.portalUserId, input.messageText.trim()]
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

    return created;
  } catch (error) {
    await client.query('ROLLBACK');
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
}): Promise<PortalMessageEntry> => {
  const internal = Boolean(input.isInternal);

  const insertResult = await pool.query(
    `INSERT INTO portal_messages (
      thread_id,
      sender_type,
      sender_user_id,
      message_text,
      is_internal,
      read_by_staff_at
    ) VALUES ($1, 'staff', $2, $3, $4, NOW())
    RETURNING id`,
    [input.threadId, input.senderUserId, input.messageText.trim(), internal]
  );

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

  return result.rowCount || 0;
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

  return result.rowCount || 0;
};

export const updateThread = async (input: {
  threadId: string;
  status?: 'open' | 'closed' | 'archived';
  pointpersonUserId?: string | null;
  caseId?: string | null;
  subject?: string | null;
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

  return getThreadById(input.threadId);
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
