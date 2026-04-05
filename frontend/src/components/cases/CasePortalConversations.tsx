import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClientMessageId, shouldSubmitComposer } from '../../features/messaging/composer';
import { usePersistedMessageDraft } from '../../features/messaging/drafts';
import { pickPreferredMessageVersion } from '../../features/messaging/messageMerge';
import { useToast } from '../../contexts/useToast';
import { casesApiClient } from '../../features/cases/api/casesApiClient';
import usePortalRealtimeStream from '../../features/portal/client/usePortalRealtimeStream';
import type { CasePortalConversation } from '../../types/case';
import type { OutcomeDefinition } from '../../types/outcomes';

const TEMP_PREFIX = 'temp-case-portal-message-';

const mergeConversationMessages = (
  messages: CasePortalConversation['messages']
): CasePortalConversation['messages'] => {
  const byKey = new Map<string, CasePortalConversation['messages'][number]>();

  for (const message of messages) {
    const key =
      message.id.startsWith(TEMP_PREFIX) && message.client_message_id
        ? `client:${message.client_message_id}`
        : `id:${message.id}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, message);
      continue;
    }

    byKey.set(key, pickPreferredMessageVersion(existing, message));
  }

  return Array.from(byKey.values()).sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
};

const mergeConversations = (
  conversations: CasePortalConversation[],
  nextConversation: CasePortalConversation
): CasePortalConversation[] => {
  const next = [
    nextConversation,
    ...conversations.filter((entry) => entry.thread.id !== nextConversation.thread.id),
  ];
  next.sort(
    (left, right) =>
      new Date(right.thread.last_message_at).getTime() -
      new Date(left.thread.last_message_at).getTime()
  );
  return next;
};

const updateConversationById = (
  conversations: CasePortalConversation[],
  threadId: string,
  updater: (conversation: CasePortalConversation) => CasePortalConversation
): CasePortalConversation[] =>
  conversations.map((conversation) =>
    conversation.thread.id === threadId ? updater(conversation) : conversation
  );

interface CasePortalConversationsProps {
  caseId: string;
  outcomeDefinitions: OutcomeDefinition[];
  onChanged?: () => void;
}

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function CasePortalConversations({
  caseId,
  outcomeDefinitions,
  onChanged,
}: CasePortalConversationsProps) {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conversations, setConversations] = useState<CasePortalConversation[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionOutcomeIds, setResolutionOutcomeIds] = useState<string[]>([]);
  const [resolutionVisibleToClient, setResolutionVisibleToClient] = useState(false);
  const [closeStatus, setCloseStatus] = useState<'closed' | 'archived'>('closed');

  const selectedConversation = useMemo(
    () => conversations.find((entry) => entry.thread.id === selectedThreadId) || null,
    [conversations, selectedThreadId]
  );
  const {
    draft: persistedReplyDraft,
    setDraft: setPersistedReplyDraft,
    clearDraft: clearPersistedReplyDraft,
  } = usePersistedMessageDraft('portal-case', selectedThreadId);

  useEffect(() => {
    setReplyMessage(persistedReplyDraft);
  }, [persistedReplyDraft]);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const nextConversations = await casesApiClient.getCasePortalConversations(caseId);
      setConversations(nextConversations);

      if (!selectedThreadId && nextConversations.length > 0) {
        setSelectedThreadId(nextConversations[0].thread.id);
      } else if (
        selectedThreadId &&
        !nextConversations.some((entry) => entry.thread.id === selectedThreadId)
      ) {
        setSelectedThreadId(nextConversations[0]?.thread.id || null);
      }
    } catch (error) {
      console.error('Failed to load case portal conversations', error);
      showError('Unable to load portal conversations for this case.');
    } finally {
      setLoading(false);
    }
  }, [caseId, selectedThreadId, showError]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  usePortalRealtimeStream({
    endpointPath: '/v2/portal/admin/stream',
    channels: ['conversations'],
    onEvent: (_eventName, payload) => {
      if (payload.case_id !== caseId || !payload.thread) {
        return;
      }
      const thread = payload.thread;

      setConversations((current) => {
        const existing = current.find((entry) => entry.thread.id === thread.id);
        if (!existing) {
          return current;
        }

        const nextConversation: CasePortalConversation = {
          thread: {
            ...existing.thread,
            id: thread.id,
            subject: thread.subject,
            status: thread.status as CasePortalConversation['thread']['status'],
            case_id: thread.case_id,
            case_number: thread.case_number,
            case_title: thread.case_title,
            contact_id: thread.contact_id,
            last_message_at: thread.last_message_at,
            unread_count: thread.staff_unread_count,
            portal_email: thread.portal_email,
          },
          messages: payload.message
            ? mergeConversationMessages([
                ...existing.messages,
                {
                  ...payload.message,
                  send_state: 'sent',
                  send_error: null,
                  optimistic: false,
                },
              ])
            : existing.messages,
        };

        return mergeConversations(current, nextConversation);
      });
    },
  });

  const resetResolutionForm = () => {
    setShowResolveForm(false);
    setResolutionNote('');
    setResolutionOutcomeIds([]);
    setResolutionVisibleToClient(false);
    setCloseStatus('closed');
  };

  const submitReply = async (input: {
    body: string;
    clientMessageId?: string;
    preserveDraft?: boolean;
  } = { body: replyMessage }): Promise<void> => {
    if (!selectedConversation || !input.body.trim()) {
      return;
    }

    const clientMessageId = input.clientMessageId || createClientMessageId();
    const optimisticMessage = {
      id: `${TEMP_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      sender_type: 'staff' as const,
      sender_display_name: 'Staff',
      message_text: input.body.trim(),
      is_internal: replyInternal,
      client_message_id: clientMessageId,
      created_at: new Date().toISOString(),
      send_state: 'sending' as const,
      send_error: null,
      optimistic: true,
    };

    setSaving(true);
    try {
      setConversations((current) =>
        updateConversationById(current, selectedConversation.thread.id, (conversation) => ({
          ...conversation,
          messages: mergeConversationMessages([...conversation.messages, optimisticMessage]),
        }))
      );

      const response = await casesApiClient.replyCasePortalConversation(caseId, selectedConversation.thread.id, {
        message: input.body.trim(),
        is_internal: replyInternal,
        client_message_id: clientMessageId,
      });
      setReplyMessage('');
      if (!input.preserveDraft) {
        clearPersistedReplyDraft();
      }
      setReplyInternal(false);
      setConversations((current) =>
        updateConversationById(current, selectedConversation.thread.id, (conversation) => ({
          ...conversation,
          messages: mergeConversationMessages(
            conversation.messages.map((message) =>
              message.client_message_id === clientMessageId
                ? {
                    ...response.message,
                    send_state: 'sent',
                    send_error: null,
                    optimistic: false,
                  }
                : message
            )
          ),
        }))
      );
      showSuccess('Reply sent.');
      onChanged?.();
    } catch (error) {
      setConversations((current) =>
        updateConversationById(current, selectedConversation.thread.id, (conversation) => ({
          ...conversation,
          messages: mergeConversationMessages(
            conversation.messages.map((message) =>
              message.client_message_id === clientMessageId
                ? {
                    ...message,
                    send_state: 'failed',
                    send_error: error instanceof Error ? error.message : 'Could not send reply.',
                    optimistic: true,
                  }
                : message
            )
          ),
        }))
      );
      console.error('Failed to send portal conversation reply', error);
      showError('Could not send reply.');
    } finally {
      setSaving(false);
    }
  };

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitReply();
  };

  const handleResolve = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedConversation) {
      return;
    }

    if (!resolutionNote.trim()) {
      showError('Resolution note is required.');
      return;
    }

    if (resolutionOutcomeIds.length === 0) {
      showError('Select at least one outcome.');
      return;
    }

    setSaving(true);
    try {
      await casesApiClient.resolveCasePortalConversation(caseId, selectedConversation.thread.id, {
        resolution_note: resolutionNote.trim(),
        outcome_definition_ids: resolutionOutcomeIds,
        close_status: closeStatus,
        visible_to_client: resolutionVisibleToClient,
      });
      showSuccess('Conversation resolved.');
      resetResolutionForm();
      await loadConversations();
      onChanged?.();
    } catch (error) {
      console.error('Failed to resolve portal conversation', error);
      showError('Could not resolve conversation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-app-text-muted">Loading portal conversations...</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-lg border border-app-border bg-app-surface p-6 text-center">
        <div className="text-sm text-app-text-muted">No portal conversations yet for this case.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-lg border border-app-border bg-app-surface">
        <div className="border-b border-app-border px-4 py-3">
          <h3 className="text-sm font-semibold text-app-text">Conversations</h3>
        </div>
        <ul className="max-h-[520px] overflow-y-auto">
          {conversations.map((conversation) => {
            const active = conversation.thread.id === selectedThreadId;
            return (
              <li key={conversation.thread.id}>
                <button
                  type="button"
                  onClick={() => setSelectedThreadId(conversation.thread.id)}
                  className={`w-full border-b border-app-border px-4 py-3 text-left hover:bg-app-surface-muted ${
                    active ? 'bg-app-surface-muted' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-app-text">
                      {conversation.thread.subject || 'Conversation'}
                    </div>
                    {conversation.thread.unread_count > 0 && (
                      <span className="rounded-full bg-app-accent px-2 py-0.5 text-xs text-[var(--app-accent-foreground)]">
                        {conversation.thread.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-app-text-muted">
                    {conversation.thread.portal_email || 'Portal user'} • {conversation.thread.status}
                  </div>
                  <div className="mt-1 text-[11px] text-app-text-subtle">
                    {formatTimestamp(conversation.thread.last_message_at)}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="rounded-lg border border-app-border bg-app-surface">
        {!selectedConversation ? (
          <div className="p-6 text-sm text-app-text-muted">Select a conversation to view details.</div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-app-border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-app-text">
                    {selectedConversation.thread.subject || 'Conversation'}
                  </div>
                  <div className="text-xs text-app-text-muted">
                    {selectedConversation.thread.portal_email || 'Portal user'} •{' '}
                    {selectedConversation.thread.status}
                  </div>
                </div>
                {selectedConversation.thread.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => setShowResolveForm((current) => !current)}
                    className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-xs text-app-text"
                  >
                    {showResolveForm ? 'Close Resolve' : 'Resolve Thread'}
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[420px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                    message.sender_type === 'staff'
                      ? 'ml-auto bg-app-accent text-[var(--app-accent-foreground)]'
                      : 'bg-app-surface-muted text-app-text'
                  }`}
                >
                  <div className="text-[11px] opacity-80">
                    {message.sender_display_name ||
                      (message.sender_type === 'staff' ? 'Staff' : 'Client')}{' '}
                    • {formatTimestamp(message.created_at)}
                    {message.is_internal && ' • Internal'}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{message.message_text}</div>
                  {(message.send_state === 'sending' || message.send_state === 'failed') && (
                    <div className="mt-2 text-[11px] opacity-80">
                      {message.send_state === 'sending' ? 'Sending...' : 'Failed to send'}
                    </div>
                  )}
                  {message.send_state === 'failed' && (
                    <button
                      type="button"
                      onClick={() =>
                        void submitReply({
                          body: message.message_text,
                          clientMessageId: message.client_message_id || undefined,
                          preserveDraft: true,
                        })
                      }
                      className="mt-2 rounded border border-current px-2 py-1 text-[11px] font-semibold"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>

            {showResolveForm && selectedConversation.thread.status === 'open' && (
              <form onSubmit={handleResolve} className="border-t border-app-border p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-app-text-muted">
                    Close as
                    <select
                      value={closeStatus}
                      onChange={(event) =>
                        setCloseStatus(event.target.value as 'closed' | 'archived')
                      }
                      className="mt-1 w-full rounded-md border border-app-input-border px-3 py-2"
                    >
                      <option value="closed">Closed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-2 self-end text-sm text-app-text-muted">
                    <input
                      type="checkbox"
                      checked={resolutionVisibleToClient}
                      onChange={(event) => setResolutionVisibleToClient(event.target.checked)}
                    />
                    Visible to client
                  </label>
                </div>
                <textarea
                  value={resolutionNote}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  rows={3}
                  placeholder="Summarize how this conversation was resolved."
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  {outcomeDefinitions.map((definition) => {
                    const checked = resolutionOutcomeIds.includes(definition.id);
                    return (
                      <label
                        key={definition.id}
                        className="flex items-start gap-2 rounded border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setResolutionOutcomeIds((current) =>
                              event.target.checked
                                ? [...current, definition.id]
                                : current.filter((id) => id !== definition.id)
                            );
                          }}
                          className="mt-0.5"
                        />
                        <span>{definition.name}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetResolutionForm}
                    className="rounded-md border border-app-input-border bg-app-surface px-4 py-2 text-sm text-app-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-app-accent px-4 py-2 text-sm text-[var(--app-accent-foreground)] disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Resolve'}
                  </button>
                </div>
              </form>
            )}

            <form onSubmit={handleReply} className="border-t border-app-border p-4 space-y-3">
              <textarea
                value={replyMessage}
                onChange={(event) => {
                  setReplyMessage(event.target.value);
                  setPersistedReplyDraft(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (shouldSubmitComposer(event)) {
                    event.preventDefault();
                    void submitReply();
                  }
                }}
                rows={3}
                placeholder="Reply to this conversation"
                className="w-full rounded-md border border-app-input-border px-3 py-2"
                disabled={selectedConversation.thread.status !== 'open'}
              />
              <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
                <input
                  type="checkbox"
                  checked={replyInternal}
                  onChange={(event) => setReplyInternal(event.target.checked)}
                  className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                />
                Internal note (not visible to client)
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    selectedConversation.thread.status !== 'open' ||
                    !replyMessage.trim()
                  }
                  className="rounded-md bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] disabled:opacity-50"
                >
                  {saving ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
