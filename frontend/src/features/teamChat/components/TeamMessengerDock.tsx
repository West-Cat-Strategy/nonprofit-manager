import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../../contexts/useToast';
import TeamMessengerConversationPanel from './TeamMessengerConversationPanel';
import { useTeamMessenger } from '../messenger/TeamMessengerContext';

const formatConversationTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function TeamMessengerDock() {
  const { showError } = useToast();
  const {
    contacts,
    closeConversation,
    conversations,
    enabled,
    launcherOpen,
    openConversation,
    openRoomIds,
    selectedRoomId,
    setLauncherOpen,
    startDirectConversation,
    toggleMinimized,
    unreadCount,
    visibleRoomIds,
  } = useTeamMessenger();
  const [directParticipantId, setDirectParticipantId] = useState('');
  const [isStartingDirectConversation, setIsStartingDirectConversation] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (!enabled) {
      document.documentElement.style.removeProperty('--team-messenger-toast-offset');
      return;
    }

    document.documentElement.style.setProperty(
      '--team-messenger-toast-offset',
      visibleRoomIds.length > 0 ? '29rem' : '5rem'
    );

    return () => {
      document.documentElement.style.removeProperty('--team-messenger-toast-offset');
    };
  }, [enabled, visibleRoomIds.length]);

  const mobileRoomId = useMemo(
    () => visibleRoomIds[visibleRoomIds.length - 1] || openRoomIds[openRoomIds.length - 1] || null,
    [openRoomIds, visibleRoomIds]
  );
  const popupSurfaceClassName = 'bg-[var(--app-bg)]';
  const popupChromeClassName = 'bg-[var(--app-bg)]';

  const handleStartDirectConversation = async (): Promise<void> => {
    if (!directParticipantId || isStartingDirectConversation) {
      return;
    }

    setIsStartingDirectConversation(true);
    try {
      await startDirectConversation(directParticipantId);
      setDirectParticipantId('');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to start direct conversation');
    } finally {
      setIsStartingDirectConversation(false);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <>
      {launcherOpen && (
        <div
          className={`fixed bottom-20 left-4 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-3xl border border-app-border p-4 shadow-2xl ${popupSurfaceClassName}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-app-text-heading">Team Messenger</div>
              <div className="text-xs text-app-text-muted">Recent staff conversations</div>
            </div>
            <Link
              to="/team-chat"
              onClick={() => setLauncherOpen(false)}
              className="rounded-xl border border-app-border px-3 py-2 text-xs font-medium text-app-text"
            >
              Open full page
            </Link>
          </div>

          <div className={`mt-4 rounded-2xl border border-app-border p-3 ${popupChromeClassName}`}>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-muted">
              Quick message
            </div>
            <select
              value={directParticipantId}
              onChange={(event) => setDirectParticipantId(event.target.value)}
              className={`mt-3 w-full rounded-xl border border-app-border px-3 py-2 text-sm text-app-text ${popupChromeClassName}`}
            >
              <option value="">Choose teammate</option>
              {contacts.map((contact) => (
                <option key={contact.user_id} value={contact.user_id}>
                  {contact.first_name || contact.last_name
                    ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                    : contact.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleStartDirectConversation()}
              disabled={!directParticipantId || isStartingDirectConversation}
              className="mt-3 w-full rounded-xl bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStartingDirectConversation ? 'Starting...' : 'Start chat'}
            </button>
          </div>

          <div className="mt-4 max-h-[20rem] space-y-2 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className={`rounded-2xl border border-dashed border-app-border px-3 py-4 text-sm text-app-text-muted ${popupChromeClassName}`}>
                No staff conversations yet.
              </div>
            ) : (
              conversations.slice(0, 8).map((conversation) => (
                <button
                  key={conversation.room_id}
                  type="button"
                  onClick={() => void openConversation(conversation.room_id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left ${
                    selectedRoomId === conversation.room_id
                      ? 'border-[#0f766e] bg-[#0f766e]/10'
                    : `border-app-border ${popupChromeClassName}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-app-text">{conversation.title}</div>
                    <div className="text-[11px] text-app-text-muted">
                      {formatConversationTime(conversation.last_message_at)}
                    </div>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-app-text-muted">
                    {conversation.last_message_preview || 'No messages yet'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {visibleRoomIds.map((roomId, index) => (
        <div
          key={roomId}
          className="hidden lg:block"
          style={{ position: 'fixed', bottom: '5rem', right: `${1 + index * 21.5}rem`, zIndex: 45 }}
        >
          <div
            className={`flex h-[28rem] w-[20rem] flex-col overflow-hidden rounded-3xl border border-app-border shadow-2xl ${popupSurfaceClassName}`}
          >
            <div className="flex items-center justify-between border-b border-app-border bg-[linear-gradient(135deg,rgba(24,144,255,0.18),rgba(15,118,110,0.12))] px-4 py-3">
              <div className="truncate text-sm font-semibold text-app-text-heading">
                {conversations.find((conversation) => conversation.room_id === roomId)?.title || 'Conversation'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMinimized(roomId)}
                  className={`rounded-lg border border-app-border px-2 py-1 text-xs text-app-text-muted ${popupChromeClassName}`}
                >
                  _
                </button>
                <button
                  type="button"
                  onClick={() => closeConversation(roomId)}
                  className={`rounded-lg border border-app-border px-2 py-1 text-xs text-app-text-muted ${popupChromeClassName}`}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <TeamMessengerConversationPanel roomId={roomId} mode="window" />
            </div>
          </div>
        </div>
      ))}

      {mobileRoomId && (
        <div className="fixed inset-x-0 bottom-16 top-20 z-40 lg:hidden">
          <div
            className={`mx-3 flex h-full flex-col overflow-hidden rounded-3xl border border-app-border shadow-2xl ${popupSurfaceClassName}`}
          >
            <div className="flex items-center justify-between border-b border-app-border bg-[linear-gradient(135deg,rgba(24,144,255,0.18),rgba(15,118,110,0.12))] px-4 py-3">
              <div className="truncate text-sm font-semibold text-app-text-heading">
                {conversations.find((conversation) => conversation.room_id === mobileRoomId)?.title || 'Conversation'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMinimized(mobileRoomId)}
                  className={`rounded-lg border border-app-border px-2 py-1 text-xs text-app-text-muted ${popupChromeClassName}`}
                >
                  Minimize
                </button>
                <button
                  type="button"
                  onClick={() => closeConversation(mobileRoomId)}
                  className={`rounded-lg border border-app-border px-2 py-1 text-xs text-app-text-muted ${popupChromeClassName}`}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <TeamMessengerConversationPanel roomId={mobileRoomId} mode="window" />
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-app-border bg-[var(--app-bg)]">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 overflow-x-auto px-3 py-3 sm:px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setLauncherOpen(!launcherOpen)}
            className="inline-flex items-center gap-2 rounded-full border border-app-border bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Team Messenger
            {unreadCount > 0 && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0f766e]">
                {unreadCount}
              </span>
            )}
          </button>

          {openRoomIds.map((roomId) => {
            const conversation = conversations.find((entry) => entry.room_id === roomId);
            if (!conversation) {
              return null;
            }

            return (
              <button
                key={roomId}
                type="button"
                onClick={() => void openConversation(roomId)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                  selectedRoomId === roomId
                    ? 'border-[#0f766e] bg-[#0f766e]/10 text-app-text'
                    : `border-app-border ${popupChromeClassName} text-app-text-muted`
                }`}
              >
                <span className="truncate">{conversation.title}</span>
                {(conversation.unread_count > 0 || conversation.unread_mentions_count > 0) && (
                  <span className="rounded-full bg-[#0f766e] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {conversation.unread_count + conversation.unread_mentions_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
