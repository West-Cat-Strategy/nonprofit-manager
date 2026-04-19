import { sendMail } from '@services/emailService';
import { logger } from '@config/logger';
import {
  publishPortalThreadUpdated,
  type PortalRealtimeMessageSnapshot,
  type PortalRealtimeThreadSnapshot,
} from '@services/portalRealtimeService';

export const sendPortalEmail = async (args: {
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

export const publishPortalThreadUpdate = async (args: {
  thread: PortalRealtimeThreadSnapshot;
  action: 'message.created' | 'thread.read' | 'thread.updated' | 'thread.status.updated';
  actorType: 'portal' | 'staff' | 'system';
  source: string;
  status: PortalRealtimeThreadSnapshot['status'];
  contactId: string;
  clientMessageId?: string | null;
  message?: PortalRealtimeMessageSnapshot | null;
}): Promise<void> => {
  publishPortalThreadUpdated({
    entityId: args.thread.id,
    caseId: args.thread.case_id,
    status: args.status,
    actorType: args.actorType,
    source: args.source,
    contactId: args.contactId,
    action: args.action,
    thread: args.thread,
    ...(args.message ? { message: args.message } : {}),
    ...(args.clientMessageId ? { clientMessageId: args.clientMessageId } : {}),
  });
};
