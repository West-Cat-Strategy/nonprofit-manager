import { useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import { useToast } from '../../../contexts/useToast';
import { shouldSubmitComposer } from '../../messaging/composer';
import { usePersistedMessageDraft } from '../../messaging/drafts';
import type { TeamChatMember } from '../types';
import { useTeamChatCaseChat } from '../hooks/useTeamChatCaseChat';

const isTeamChatEnabled = import.meta.env.VITE_TEAM_CHAT_ENABLED !== 'false';

interface CaseTeamChatPanelProps {
  caseId: string;
}

const formatMemberName = (member: TeamChatMember): string => {
  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
  if (fullName) {
    return fullName;
  }
  return member.email || member.user_id;
};

const parseMentionInput = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );

const CaseTeamChatPanel = ({ caseId }: CaseTeamChatPanelProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const { showError, showSuccess } = useToast();
  const [messageBody, setMessageBody] = useState('');
  const [mentionInput, setMentionInput] = useState('');
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamChatMember['membership_role']>('member');

  const canManageMembers = useMemo(
    () => ['admin', 'manager'].includes(user?.role || ''),
    [user?.role]
  );

  const {
    room,
    members,
    messages,
    loading,
    sending,
    error,
    streamStatus,
    refresh,
    loadOlderMessages,
    sendMessage,
    retryMessage,
    markRead,
    addMember,
    removeMember,
  } = useTeamChatCaseChat({
    caseId,
    enabled: isTeamChatEnabled,
    currentUserId: user?.id,
  });
  const {
    draft: persistedDraft,
    setDraft: setPersistedDraft,
    clearDraft,
  } = usePersistedMessageDraft('case-chat', caseId);

  useEffect(() => {
    setMessageBody(persistedDraft);
  }, [persistedDraft]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) {
      return;
    }

    void markRead(latestMessage.id);
  }, [messages, markRead]);

  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const handleSendMessage = async () => {
    if (!user?.id) {
      showError('You must be signed in to send messages');
      return;
    }

    const trimmedBody = messageBody.trim();
    if (!trimmedBody) {
      return;
    }

    try {
      await sendMessage(
        {
          body: trimmedBody,
          mention_user_ids: parseMentionInput(mentionInput),
        },
        {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      );
      setMessageBody('');
      clearDraft();
      setMentionInput('');
    } catch {
      // Hook already manages optimistic rollback and error state.
    }
  };

  const handleLoadOlder = async () => {
    const loaded = await loadOlderMessages();
    if (loaded === 0) {
      showSuccess('No older messages available');
    }
  };

  const handleAddMember = async () => {
    const userId = newMemberUserId.trim();
    if (!userId) {
      showError('User ID is required');
      return;
    }

    await addMember(userId, newMemberRole);
    setNewMemberUserId('');
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMember(userId);
  };

  if (!isTeamChatEnabled) {
    return (
      <BrutalCard color="yellow" className="p-4">
        <p className="text-sm font-bold text-black/70">Team chat is disabled.</p>
      </BrutalCard>
    );
  }

  if (loading) {
    return (
      <BrutalCard color="white" className="p-6">
        <p className="text-sm font-bold text-black/70">Loading case chat...</p>
      </BrutalCard>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <BrutalCard color="white" className="p-4 xl:col-span-2 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black uppercase text-black">Case Chat</h3>
            <p className="text-xs font-bold text-black/60">
              {room?.unread_count || 0} unread · {room?.unread_mentions_count || 0} mentions ·{' '}
              {streamStatus === 'connected' ? 'live' : 'polling'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BrutalButton onClick={handleLoadOlder} variant="secondary" size="sm">
              Load Older
            </BrutalButton>
            <BrutalButton onClick={() => void refresh()} variant="secondary" size="sm">
              Refresh
            </BrutalButton>
          </div>
        </div>

        <div className="h-[420px] overflow-y-auto border-2 border-black p-3 bg-app-surface space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm font-bold text-black/60">No messages yet.</p>
          ) : (
            messages.map((message) => {
              const isMine = message.sender_user_id === user?.id;
              const isOptimistic = Boolean(
                message.metadata && (message.metadata as Record<string, unknown>).optimistic
              );

              return (
                <div
                  key={message.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] border-2 border-black px-3 py-2 ${
                      isMine ? 'bg-[var(--loop-cyan)]' : 'bg-white'
                    } ${isOptimistic ? 'opacity-70' : ''}`}
                  >
                    <div className="text-xs font-black uppercase text-black/60 mb-1">
                      {message.sender_first_name || message.sender_last_name
                        ? `${message.sender_first_name || ''} ${message.sender_last_name || ''}`.trim()
                        : message.sender_user_id}
                    </div>
                    <div className="text-sm font-bold text-black whitespace-pre-wrap">{message.body}</div>
                    <div className="text-[11px] font-bold text-black/50 mt-2">
                      {new Date(message.created_at).toLocaleString()}
                      {message.send_state === 'sending' && ' · Sending'}
                      {message.send_state === 'failed' && ' · Failed'}
                    </div>
                    {message.send_state === 'failed' && user?.id && (
                      <div className="mt-2">
                        <BrutalButton
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            void retryMessage(message.id, {
                              id: user.id,
                              firstName: user.firstName,
                              lastName: user.lastName,
                            })
                          }
                        >
                          Retry
                        </BrutalButton>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-2">
          <textarea
            value={messageBody}
            onChange={(event) => {
              setMessageBody(event.target.value);
              setPersistedDraft(event.target.value);
            }}
            onKeyDown={(event) => {
              if (shouldSubmitComposer(event)) {
                event.preventDefault();
                void handleSendMessage();
              }
            }}
            rows={3}
            className="w-full border-2 border-black px-3 py-2 text-sm font-bold bg-app-surface text-black"
            placeholder="Write a message..."
          />
          <input
            value={mentionInput}
            onChange={(event) => setMentionInput(event.target.value)}
            className="w-full border-2 border-black px-3 py-2 text-xs font-bold bg-app-surface text-black"
            placeholder="Mention user IDs (comma separated, optional)"
          />
          <div className="flex justify-end">
            <BrutalButton onClick={() => void handleSendMessage()} disabled={sending}>
              {sending ? 'Sending...' : 'Send Message'}
            </BrutalButton>
          </div>
        </div>
      </BrutalCard>

      <BrutalCard color="white" className="p-4 space-y-3">
        <h3 className="text-lg font-black uppercase text-black">Members</h3>

        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.user_id}
              className="border-2 border-black p-2 bg-app-surface flex items-center justify-between gap-2"
            >
              <div>
                <div className="text-sm font-black text-black">{formatMemberName(member)}</div>
                <div className="text-xs font-bold uppercase text-black/60">
                  {member.membership_role} · {member.source}
                </div>
              </div>
              {canManageMembers && member.user_id !== user?.id && (
                <BrutalButton
                  variant="danger"
                  size="sm"
                  onClick={() => void handleRemoveMember(member.user_id)}
                >
                  Remove
                </BrutalButton>
              )}
            </li>
          ))}
        </ul>

        {canManageMembers && (
          <div className="border-t-2 border-black pt-3 space-y-2">
            <h4 className="text-xs font-black uppercase text-black/70">Add Member</h4>
            <input
              value={newMemberUserId}
              onChange={(event) => setNewMemberUserId(event.target.value)}
              className="w-full border-2 border-black px-3 py-2 text-xs font-bold bg-app-surface text-black"
              placeholder="User ID"
            />
            <select
              value={newMemberRole}
              onChange={(event) => setNewMemberRole(event.target.value as TeamChatMember['membership_role'])}
              className="w-full border-2 border-black px-3 py-2 text-xs font-bold bg-app-surface text-black"
            >
              <option value="member">Member</option>
              <option value="observer">Observer</option>
              <option value="owner">Owner</option>
            </select>
            <BrutalButton onClick={() => void handleAddMember()} size="sm">
              Add
            </BrutalButton>
          </div>
        )}
      </BrutalCard>
    </div>
  );
};

export default CaseTeamChatPanel;
