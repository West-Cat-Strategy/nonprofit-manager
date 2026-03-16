export type MessagingSurface =
  | 'team-messenger'
  | 'case-chat'
  | 'portal-admin'
  | 'portal-case'
  | 'portal-client';

export type MessageSendState = 'sending' | 'failed' | 'sent';

export interface PersistedMessageDraft {
  key: string;
  surface: MessagingSurface;
  threadId: string;
  value: string;
  updatedAt: string;
}

export interface ClientMessageState {
  clientMessageId: string | null;
  sendState: MessageSendState;
  sendError: string | null;
  optimistic: boolean;
}
