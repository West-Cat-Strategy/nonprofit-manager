// Reserved for phase-2 push transport; v1 emits polling-friendly HTTP + logs only.
export const TeamChatEventName = {
  MESSAGE_CREATED: 'team_chat.message.created',
  ROOM_READ: 'team_chat.room.read',
  MEMBER_ADDED: 'team_chat.member.added',
  MEMBER_REMOVED: 'team_chat.member.removed',
  ROOM_BOOTSTRAPPED: 'team_chat.room.bootstrapped',
} as const;

export type TeamChatEventName = (typeof TeamChatEventName)[keyof typeof TeamChatEventName];
