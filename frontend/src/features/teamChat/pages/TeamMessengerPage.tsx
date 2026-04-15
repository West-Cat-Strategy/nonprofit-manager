import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../contexts/useToast';
import TeamMessengerConversationPanel from '../components/TeamMessengerConversationPanel';
import { useTeamMessenger } from '../messenger/TeamMessengerContext';

const formatContactLabel = (
  contact: { first_name: string | null; last_name: string | null; email: string }
): string => {
  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
  return fullName || contact.email;
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function TeamMessengerPage() {
  const { showError } = useToast();
  const {
    contacts,
    conversations,
    loading,
    openConversation,
    selectedRoomId,
    setSelectedRoomId,
    startDirectConversation,
    createGroupConversation,
    streamStatus,
    unreadCount,
  } = useTeamMessenger();
  const [search, setSearch] = useState('');
  const [directParticipantId, setDirectParticipantId] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [groupParticipantIds, setGroupParticipantIds] = useState<string[]>([]);
  const [isStartingDirectConversation, setIsStartingDirectConversation] = useState(false);
  const [isCreatingGroupConversation, setIsCreatingGroupConversation] = useState(false);

  useEffect(() => {
    if (!selectedRoomId && conversations[0]?.room_id) {
      setSelectedRoomId(conversations[0].room_id);
    }
  }, [conversations, selectedRoomId, setSelectedRoomId]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const haystack = [
        conversation.title,
        conversation.last_message_preview || '',
        conversation.counterpart_email || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [conversations, search]);

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

  const handleCreateGroupConversation = async (): Promise<void> => {
    if (
      !groupTitle.trim() ||
      groupParticipantIds.length < 2 ||
      isCreatingGroupConversation
    ) {
      return;
    }

    setIsCreatingGroupConversation(true);
    try {
      await createGroupConversation({
        title: groupTitle.trim(),
        participant_user_ids: groupParticipantIds,
      });
      setGroupTitle('');
      setGroupParticipantIds([]);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create group conversation');
    } finally {
      setIsCreatingGroupConversation(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="rounded-3xl border border-app-border bg-[linear-gradient(140deg,rgba(15,118,110,0.14),rgba(24,144,255,0.12),rgba(255,255,255,0.92))] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-app-text-muted">
              Staff messaging
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-app-text-heading">Team Messenger</h1>
            <p className="mt-2 max-w-2xl text-sm text-app-text-muted">
              Real-time direct and group messaging for staff, kept distinct from Case Chat and Portal Conversations.
            </p>
          </div>
          <div className="grid gap-2 rounded-2xl border border-app-border bg-app-surface/80 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-6">
              <span className="text-app-text-muted">Unread</span>
              <span className="font-semibold text-app-text">{unreadCount}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-app-text-muted">Realtime</span>
              <span className="font-semibold text-app-text capitalize">{streamStatus}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-app-text-heading">Start a direct message</h2>
            <select
              value={directParticipantId}
              onChange={(event) => setDirectParticipantId(event.target.value)}
              className="mt-3 w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
            >
              <option value="">Choose a teammate</option>
              {contacts.map((contact) => (
                <option key={contact.user_id} value={contact.user_id}>
                  {formatContactLabel(contact)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleStartDirectConversation()}
              disabled={!directParticipantId || isStartingDirectConversation}
              className="app-messenger-accent mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStartingDirectConversation ? 'Starting...' : 'Message teammate'}
            </button>
          </section>

          <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-app-text-heading">Create a group</h2>
            <input
              value={groupTitle}
              onChange={(event) => setGroupTitle(event.target.value)}
              className="mt-3 w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
              placeholder="Group name"
            />
            <select
              multiple
              value={groupParticipantIds}
              onChange={(event) =>
                setGroupParticipantIds(
                  Array.from(event.target.selectedOptions).map((option) => option.value)
                )
              }
              className="mt-3 min-h-[10rem] w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
            >
              {contacts.map((contact) => (
                <option key={contact.user_id} value={contact.user_id}>
                  {formatContactLabel(contact)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleCreateGroupConversation()}
              disabled={
                isCreatingGroupConversation ||
                !groupTitle.trim() ||
                groupParticipantIds.length < 2
              }
              className="mt-3 w-full rounded-xl border border-app-border bg-app-bg px-4 py-2 text-sm font-semibold text-app-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingGroupConversation ? 'Creating...' : 'Create group chat'}
            </button>
          </section>

          <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-app-text-heading">Conversations</h2>
              <span className="text-xs text-app-text-muted">{filteredConversations.length}</span>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-3 w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
              placeholder="Search messages"
            />
            <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto">
              {loading ? (
                <div className="rounded-xl border border-dashed border-app-border bg-app-bg px-3 py-4 text-sm text-app-text-muted">
                  Loading conversations...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-app-border bg-app-bg px-3 py-4 text-sm text-app-text-muted">
                  No team conversations yet.
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation.room_id}
                    type="button"
                    onClick={() => void openConversation(conversation.room_id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      selectedRoomId === conversation.room_id
                        ? 'app-messenger-accent-soft'
                        : 'border-app-border bg-app-bg hover:bg-app-surface-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-app-text">{conversation.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-app-text-muted">
                          {conversation.room_type}
                        </div>
                      </div>
                      {(conversation.unread_count > 0 || conversation.unread_mentions_count > 0) && (
                        <span className="app-messenger-accent rounded-full px-2 py-1 text-[11px] font-semibold">
                          {conversation.unread_count + conversation.unread_mentions_count}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm text-app-text-muted">
                      {conversation.last_message_preview || 'No messages yet'}
                    </div>
                    <div className="mt-2 text-[11px] text-app-text-muted">
                      {formatTimestamp(conversation.last_message_at)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="min-h-[42rem]">
          {selectedRoomId ? (
            <TeamMessengerConversationPanel roomId={selectedRoomId} mode="page" />
          ) : (
            <div className="flex h-full min-h-[42rem] items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface p-6 text-center text-sm text-app-text-muted">
              Select a conversation or start a new one to open Team Messenger.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
