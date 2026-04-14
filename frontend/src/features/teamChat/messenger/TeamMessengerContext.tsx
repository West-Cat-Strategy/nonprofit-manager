import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAppSelector } from '../../../store/hooks';
import type {
  TeamMessengerContact,
  TeamMessengerConversationDetail,
  TeamMessengerConversationMemberUpdateDTO,
  TeamMessengerConversationMessageCreateDTO,
  TeamMessengerConversationSummary,
  TeamMessengerConversationUpdateDTO,
  TeamMessengerGroupConversationCreateDTO,
  TeamMessengerStreamStatus,
} from './types';
import { useTeamMessengerController } from './useTeamMessengerController';
const teamChatEnabled = import.meta.env.VITE_TEAM_CHAT_ENABLED !== 'false';

interface TeamMessengerContextValue {
  enabled: boolean;
  loading: boolean;
  conversations: TeamMessengerConversationSummary[];
  contacts: TeamMessengerContact[];
  selectedRoomId: string | null;
  setSelectedRoomId: (roomId: string | null) => void;
  openRoomIds: string[];
  visibleRoomIds: string[];
  minimizedRoomIds: string[];
  unreadCount: number;
  streamStatus: TeamMessengerStreamStatus;
  launcherOpen: boolean;
  setLauncherOpen: (open: boolean) => void;
  conversationDetails: Record<string, TeamMessengerConversationDetail | undefined>;
  typingByRoomId: Record<string, string[]>;
  openConversation: (roomId: string) => Promise<void>;
  closeConversation: (roomId: string) => void;
  toggleMinimized: (roomId: string) => void;
  refresh: () => Promise<void>;
  startDirectConversation: (participantUserId: string) => Promise<void>;
  createGroupConversation: (payload: TeamMessengerGroupConversationCreateDTO) => Promise<void>;
  sendMessage: (roomId: string, payload: TeamMessengerConversationMessageCreateDTO) => Promise<void>;
  retryMessage: (roomId: string, messageId: string) => Promise<void>;
  markConversationRead: (roomId: string, messageId?: string) => Promise<void>;
  updateTyping: (roomId: string, isTyping: boolean) => Promise<void>;
  updateConversation: (roomId: string, payload: TeamMessengerConversationUpdateDTO) => Promise<void>;
  addConversationMember: (
    roomId: string,
    payload: TeamMessengerConversationMemberUpdateDTO
  ) => Promise<void>;
  removeConversationMember: (roomId: string, userId: string) => Promise<void>;
  getPresenceStatus: (userId: string | null | undefined) => 'online' | 'offline';
}

const TeamMessengerContext = createContext<TeamMessengerContextValue | null>(null);

export function TeamMessengerProvider({ children }: { children: ReactNode }) {
  const { authLoading, user } = useAppSelector((state) => state.auth);
  const enabled =
    teamChatEnabled &&
    !authLoading &&
    Boolean(user?.id) &&
    ['admin', 'manager', 'staff'].includes((user?.role || '').toLowerCase());
  const controller = useTeamMessengerController({
    enabled,
    user: user?.id
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      : null,
  });

  const value = useMemo<TeamMessengerContextValue>(
    () => ({
      enabled,
      ...controller,
    }),
    [controller, enabled]
  );

  return (
    <TeamMessengerContext.Provider value={value}>
      {children}
    </TeamMessengerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTeamMessenger = (): TeamMessengerContextValue => {
  const context = useContext(TeamMessengerContext);
  if (!context) {
    throw new Error('useTeamMessenger must be used within a TeamMessengerProvider');
  }
  return context;
};
