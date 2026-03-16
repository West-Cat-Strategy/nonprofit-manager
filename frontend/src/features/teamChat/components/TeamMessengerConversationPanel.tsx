import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shouldSubmitComposer } from '../../messaging/composer';
import { usePersistedMessageDraft } from '../../messaging/drafts';
import { useAppSelector } from '../../../store/hooks';
import { useTeamMessenger } from '../messenger/TeamMessengerContext';
import type { TeamChatMember } from '../types';

interface TeamMessengerConversationPanelProps {
  roomId: string;
  mode: 'page' | 'window';
}

const formatMemberName = (member: Pick<TeamChatMember, 'first_name' | 'last_name' | 'email' | 'user_id'>): string => {
  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
  if (fullName) {
    return fullName;
  }
  return member.email || member.user_id;
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function TeamMessengerConversationPanel({
  roomId,
  mode,
}: TeamMessengerConversationPanelProps) {
  const { user } = useAppSelector((state) => state.auth);
  const {
    contacts,
    conversationDetails,
    getPresenceStatus,
    addConversationMember,
    markConversationRead,
    removeConversationMember,
    retryMessage,
    sendMessage,
    typingByRoomId,
    updateConversation,
    updateTyping,
  } = useTeamMessenger();
  const [titleDraft, setTitleDraft] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamChatMember['membership_role']>('member');
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const {
    draft: messageBody,
    setDraft: setMessageBody,
    clearDraft,
  } = usePersistedMessageDraft('team-messenger', roomId);

  const detail = conversationDetails[roomId];
  const room = detail?.room;
  const members = useMemo(() => detail?.members ?? [], [detail?.members]);
  const messages = useMemo(() => detail?.messages ?? [], [detail?.messages]);
  const currentUserId = user?.id || '';

  useEffect(() => {
    setTitleDraft(room?.title || '');
  }, [room?.title]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, roomId]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.sender_user_id === currentUserId) {
      return;
    }

    void markConversationRead(roomId, latestMessage.id);
  }, [currentUserId, markConversationRead, messages, roomId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (typingActiveRef.current) {
        void updateTyping(roomId, false);
      }
    };
  }, [roomId, updateTyping]);

  const typingUsers = useMemo(() => {
    const typingIds = typingByRoomId[roomId] || [];
    return members
      .filter((member) => typingIds.includes(member.user_id) && member.user_id !== currentUserId)
      .map((member) => formatMemberName(member));
  }, [currentUserId, members, roomId, typingByRoomId]);

  const availableContacts = useMemo(() => {
    const memberIds = new Set(members.map((member) => member.user_id));
    return contacts.filter((contact) => !memberIds.has(contact.user_id));
  }, [contacts, members]);

  const isGroupOwner = useMemo(() => {
    if (!currentUserId) {
      return false;
    }

    return members.some(
      (member) => member.user_id === currentUserId && member.membership_role === 'owner'
    );
  }, [currentUserId, members]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      void updateTyping(roomId, false);
    }
  }, [roomId, updateTyping]);

  const handleTypingPulse = useCallback(() => {
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      void updateTyping(roomId, true);
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      typingActiveRef.current = false;
      void updateTyping(roomId, false);
    }, 1500);
  }, [roomId, updateTyping]);

  if (!detail || !room) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-app-border bg-app-surface p-4 text-sm text-app-text-muted">
        Loading conversation...
      </div>
    );
  }

  const counterpartPresence = getPresenceStatus(room.counterpart_user_id);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface">
      <div className="border-b border-app-border bg-[linear-gradient(135deg,rgba(24,144,255,0.12),rgba(16,185,129,0.08))] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-app-text-heading">{room.title}</h3>
            <p className="text-xs text-app-text-muted">
              {room.room_type === 'direct'
                ? counterpartPresence === 'online'
                  ? 'Available now'
                  : 'Offline'
                : `${members.length} team members`}
            </p>
          </div>
          <span className="rounded-full border border-app-border bg-app-surface px-2 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-app-text-muted">
            {room.room_type}
          </span>
        </div>

        {mode === 'page' && room.room_type === 'group' && isGroupOwner && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              className="min-w-[14rem] flex-1 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
              placeholder="Group name"
            />
            <button
              type="button"
              onClick={() => void updateConversation(roomId, { title: titleDraft.trim() || room.title })}
              className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text"
            >
              Rename
            </button>
          </div>
        )}
      </div>

      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto bg-app-bg/60 px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-6 text-center text-sm text-app-text-muted">
            No messages yet.
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_user_id === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl border px-3 py-2 shadow-sm ${
                    isMine
                      ? 'border-[#0f766e] bg-[#0f766e] text-white'
                      : 'border-app-border bg-app-surface text-app-text'
                  }`}
                >
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] opacity-75">
                    {formatMemberName({
                      first_name: message.sender_first_name,
                      last_name: message.sender_last_name,
                      email: null,
                      user_id: message.sender_user_id,
                    })}
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{message.body}</div>
                  <div className="mt-2 text-[11px] opacity-70">
                    {formatTimestamp(message.created_at)}
                    {message.send_state === 'sending' && ' · Sending'}
                    {message.send_state === 'failed' && ' · Failed'}
                  </div>
                  {message.send_state === 'failed' && (
                    <button
                      type="button"
                      onClick={() => void retryMessage(roomId, message.id)}
                      className="mt-2 rounded-lg border border-current px-2 py-1 text-[11px] font-semibold"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-app-border bg-app-surface px-4 py-3">
        {typingUsers.length > 0 && (
          <div className="mb-2 text-xs text-app-text-muted">
            {typingUsers.join(', ')} typing...
          </div>
        )}

        <textarea
          value={messageBody}
          onChange={(event) => {
            const nextValue = event.target.value;
            setMessageBody(nextValue);
            if (nextValue.trim()) {
              handleTypingPulse();
            } else {
              stopTyping();
            }
          }}
          onBlur={stopTyping}
          onKeyDown={(event) => {
            if (shouldSubmitComposer(event)) {
              event.preventDefault();
              const trimmedBody = messageBody.trim();
              if (!trimmedBody) {
                return;
              }

              stopTyping();
              void sendMessage(roomId, { body: trimmedBody })
                .then(() => {
                  clearDraft();
                })
                .catch(() => {
                  // Context keeps the failed message visible for retry.
                });
            }
          }}
          rows={mode === 'page' ? 4 : 3}
          className="w-full rounded-2xl border border-app-border bg-app-bg px-3 py-3 text-sm text-app-text"
          placeholder="Write a message..."
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-app-text-muted">
            {room.unread_count > 0 ? `${room.unread_count} unread` : 'All caught up'}
          </div>
          <button
            type="button"
            onClick={async () => {
              const trimmedBody = messageBody.trim();
              if (!trimmedBody) {
                return;
              }

              stopTyping();
              try {
                await sendMessage(roomId, { body: trimmedBody });
                clearDraft();
              } catch {
                // Context keeps the failed message visible for retry.
              }
            }}
            className="rounded-xl bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Send
          </button>
        </div>

        {mode === 'page' && room.room_type === 'group' && (
          <div className="mt-4 border-t border-app-border pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-app-text-heading">Group Members</h4>
              <span className="text-xs text-app-text-muted">{members.length} members</span>
            </div>

            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2"
                >
                  <div>
                    <div className="text-sm text-app-text">{formatMemberName(member)}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-app-text-muted">
                      {member.membership_role}
                    </div>
                  </div>
                  {isGroupOwner && member.user_id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => void removeConversationMember(roomId, member.user_id)}
                      className="rounded-lg border border-app-border px-2 py-1 text-xs font-medium text-app-text-muted"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isGroupOwner && availableContacts.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <select
                  value={newMemberId}
                  onChange={(event) => setNewMemberId(event.target.value)}
                  className="min-w-[14rem] flex-1 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
                >
                  <option value="">Select teammate</option>
                  {availableContacts.map((contact) => (
                    <option key={contact.user_id} value={contact.user_id}>
                      {contact.first_name || contact.last_name
                        ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                        : contact.email}
                    </option>
                  ))}
                </select>
                <select
                  value={newMemberRole}
                  onChange={(event) => setNewMemberRole(event.target.value as TeamChatMember['membership_role'])}
                  className="rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
                >
                  <option value="member">Member</option>
                  <option value="observer">Observer</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!newMemberId) {
                      return;
                    }

                    void addConversationMember(roomId, {
                      user_id: newMemberId,
                      membership_role: newMemberRole,
                    });
                    setNewMemberId('');
                    setNewMemberRole('member');
                  }}
                  className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
