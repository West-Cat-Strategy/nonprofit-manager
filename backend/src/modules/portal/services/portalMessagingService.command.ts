import pool from '@config/database';
import type { PortalMessageEntry, PortalThreadSummary, ThreadWithMessages } from './portalMessagingService.types';
import {
  buildRealtimeThreadSnapshot,
  getPortalMessageByClientMessageId,
  getThreadById,
  getThreadMessages,
  toRealtimeMessageSnapshot,
} from './portalMessagingService.query';
import { sendPortalEmail, publishPortalThreadUpdate } from './portalMessagingService.notification';
import { resolveCaseForPortalMessage, ensureThreadForPortal } from './portalMessagingService.validation';

export const createPortalThreadWithMessage = async (input: {
  portalUserId: string;
  contactId: string;
  caseId?: string | null;
  subject?: string | null;
  messageText: string;
}): Promise<ThreadWithMessages> => {
  const selection = await resolveCaseForPortalMessage(input.contactId, input.caseId);
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

    await sendPortalEmail({
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

    await publishPortalThreadUpdate({
      thread: await buildRealtimeThreadSnapshot(thread),
      status: thread.status,
      actorType: 'portal',
      source: 'portal.thread.create',
      contactId: thread.contact_id,
      action: 'message.created',
      message: messages[0] ? toRealtimeMessageSnapshot(messages[0]) : null,
      ...(messages[0]?.client_message_id ? { clientMessageId: messages[0].client_message_id } : {}),
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

    await sendPortalEmail({
      to: thread.pointperson_email,
      subject: `Client portal reply${thread.case_number ? ` (${thread.case_number})` : ''}`,
      body: input.messageText.trim(),
    });

    await publishPortalThreadUpdate({
      thread: await buildRealtimeThreadSnapshot(thread),
      status: thread.status,
      actorType: 'portal',
      source: 'portal.thread.reply',
      contactId: thread.contact_id,
      action: 'message.created',
      message: toRealtimeMessageSnapshot(created),
      clientMessageId: created.client_message_id,
    });

    return created;
  } catch (error) {
    await client.query('ROLLBACK');

    if (
      input.clientMessageId &&
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
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
    if (
      input.clientMessageId &&
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
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
    await sendPortalEmail({
      to: thread.portal_email,
      subject: `New staff reply${thread.case_number ? ` (${thread.case_number})` : ''}`,
      body: input.messageText.trim(),
    });
  }

  if (thread) {
    await publishPortalThreadUpdate({
      thread: await buildRealtimeThreadSnapshot(thread),
      status: thread.status,
      actorType: 'staff',
      source: internal ? 'admin.thread.internal_note' : 'admin.thread.reply',
      contactId: thread.contact_id,
      action: 'message.created',
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
    await publishPortalThreadUpdate({
      thread: await buildRealtimeThreadSnapshot(thread),
      status: thread.status,
      actorType: 'portal',
      source: 'portal.thread.read',
      contactId: thread.contact_id,
      action: 'thread.read',
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
      await publishPortalThreadUpdate({
        thread: await buildRealtimeThreadSnapshot(thread),
        status: thread.status,
        actorType: 'staff',
        source: 'admin.thread.read',
        contactId: thread.contact_id,
        action: 'thread.read',
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

  await publishPortalThreadUpdate({
    thread: await buildRealtimeThreadSnapshot(updatedThread),
    status: updatedThread.status,
    actorType: input.actorType || 'staff',
    source: input.status ? 'thread.status.update' : 'thread.update',
    contactId: updatedThread.contact_id,
    action: input.status ? 'thread.status.updated' : 'thread.updated',
  });

  return updatedThread;
};
