import { logPortalActivity } from '@services/domains/integration';
import type { PortalMessagingPort } from '../types/ports';

const normalizeUserAgent = (userAgent?: string | string[]): string | null =>
  typeof userAgent === 'string' ? userAgent : null;

export class PortalMessagingUseCase {
  constructor(private readonly messagingPort: PortalMessagingPort) {}

  listThreads(portalUserId: string): Promise<unknown[]> {
    return this.messagingPort.listPortalThreads(portalUserId);
  }

  async createThread(input: {
    portalUserId: string;
    contactId: string;
    caseId: string | null;
    subject: string | null;
    message: string;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<unknown> {
    const payload = await this.messagingPort.createThreadWithMessage({
      portalUserId: input.portalUserId,
      contactId: input.contactId,
      caseId: input.caseId,
      subject: input.subject,
      messageText: input.message,
    });

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'messages.thread.create',
      details: `Created portal thread ${payload.thread.id}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return payload;
  }

  getThread(portalUserId: string, threadId: string): Promise<unknown | null> {
    return this.messagingPort.getPortalThread(portalUserId, threadId);
  }

  async addReply(input: {
    portalUserId: string;
    threadId: string;
    message: string;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<unknown> {
    const createdMessage = await this.messagingPort.addPortalMessage({
      portalUserId: input.portalUserId,
      threadId: input.threadId,
      messageText: input.message,
    });

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'messages.thread.reply',
      details: `Replied to portal thread ${input.threadId}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return createdMessage;
  }

  markRead(portalUserId: string, threadId: string): Promise<number> {
    return this.messagingPort.markPortalThreadRead(portalUserId, threadId);
  }

  updateThread(input: {
    threadId: string;
    status?: 'open' | 'closed' | 'archived';
    subject?: string | null;
  }): Promise<unknown | null> {
    return this.messagingPort.updateThread({
      threadId: input.threadId,
      status: input.status,
      subject: input.subject,
      closedBy: null,
    });
  }
}
