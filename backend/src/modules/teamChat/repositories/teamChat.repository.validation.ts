import { DEFAULT_MESSAGE_LIMIT } from './teamChat.repository.shared';

export class TeamChatValidationRepository {
  validateMessageBody(body: string): string {
    return body.trim();
  }

  normalizeMessageLimit(limit?: number): number {
    return Math.max(1, Math.min(limit ?? DEFAULT_MESSAGE_LIMIT, 100));
  }

  normalizeRoomTitle(title: string): string {
    return title.trim();
  }

  normalizeClientMessageId(clientMessageId?: string | null): string | null {
    return clientMessageId || null;
  }

  dedupeMentionUserIds(
    mentionUserIds: TeamChatMessageMentionUserIds,
    senderUserId: string
  ): string[] {
    return Array.from(
      new Set(
        (mentionUserIds || []).filter((id) => id && id !== senderUserId).map((id) => String(id))
      )
    );
  }
}

type TeamChatMessageMentionUserIds = Array<string> | undefined;
