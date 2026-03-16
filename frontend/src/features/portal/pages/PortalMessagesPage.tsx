import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClientMessageId, shouldSubmitComposer } from '../../messaging/composer';
import { usePersistedMessageDraft } from '../../messaging/drafts';
import { pickPreferredMessageVersion } from '../../messaging/messageMerge';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import { useToast } from '../../../contexts/useToast';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import { usePersistentPortalCaseContext } from '../../../hooks/usePersistentPortalCaseContext';
import usePortalMessageThreads from '../../../features/portal/client/usePortalMessageThreads';
import type { PortalStreamStatus } from '../../../features/portal/client/types';

interface PortalCaseContext {
  case_id: string;
  case_number: string;
  case_title: string;
  assigned_to: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  is_messageable: boolean;
  is_default: boolean;
}

interface PointpersonContextPayload {
  default_case_id: string | null;
  default_pointperson_user_id: string | null;
  selected_case_id?: string | null;
  selected_pointperson_user_id?: string | null;
  cases: PortalCaseContext[];
}

interface ThreadSummary {
  id: string;
  subject: string | null;
  status: 'open' | 'closed' | 'archived';
  case_number: string | null;
  case_title: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  unread_count: number;
  last_message_at: string;
  last_message_preview: string | null;
}

interface MessageEntry {
  id: string;
  sender_type: 'portal' | 'staff' | 'system';
  message_text: string;
  sender_display_name: string | null;
  client_message_id?: string | null;
  created_at: string;
  send_state?: 'sending' | 'failed' | 'sent';
  send_error?: string | null;
  optimistic?: boolean;
}

interface ThreadDetailResponse {
  thread: ThreadSummary;
  messages: MessageEntry[];
}

type ThreadStatusFilter = 'all' | 'open' | 'closed' | 'archived';
type ThreadCaseFilter = 'all' | 'selected';
const TEMP_PREFIX = 'temp-portal-client-message-';

const mergeThreadMessages = (messages: MessageEntry[]): MessageEntry[] => {
  const byKey = new Map<string, MessageEntry>();

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

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const getStreamStatusBadge = (status: PortalStreamStatus): { label: string; className: string } => {
  if (status === 'connected') {
    return {
      label: 'Live updates on',
      className: 'bg-app-accent-soft text-app-accent-text',
    };
  }

  if (status === 'connecting') {
    return {
      label: 'Connecting live updates...',
      className: 'bg-app-surface-muted text-app-text-muted',
    };
  }

  if (status === 'error') {
    return {
      label: 'Live updates unavailable (polling)',
      className: 'bg-app-accent-soft text-app-accent-text',
    };
  }

  return {
    label: 'Live updates disabled (polling)',
    className: 'bg-app-surface-muted text-app-text-muted',
  };
};

export default function PortalMessages() {
  const { showSuccess, showError } = useToast();
  const [context, setContext] = useState<PointpersonContextPayload | null>(null);
  const [activeThread, setActiveThread] = useState<ThreadDetailResponse | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  const [threadStatusFilter, setThreadStatusFilter] = useState<ThreadStatusFilter>('all');
  const [threadCaseFilter, setThreadCaseFilter] = useState<ThreadCaseFilter>('selected');

  const {
    selectedCaseId,
    setSelectedCaseId,
    clearSelectedCaseId,
  } = usePersistentPortalCaseContext();
  const {
    draft: newMessageDraft,
    setDraft: setNewMessageDraft,
    clearDraft: clearNewMessageDraft,
  } = usePersistedMessageDraft('portal-client', `new-thread:${selectedCaseId || 'none'}`);
  const {
    draft: replyMessageDraft,
    setDraft: setReplyMessageDraft,
    clearDraft: clearReplyMessageDraft,
  } = usePersistedMessageDraft('portal-client', activeThreadId ? `reply:${activeThreadId}` : null);

  useEffect(() => {
    setNewMessage(newMessageDraft);
  }, [newMessageDraft]);

  useEffect(() => {
    setReplyMessage(replyMessageDraft);
  }, [replyMessageDraft]);

  const selectedCase = useMemo(
    () => context?.cases.find((entry) => entry.case_id === selectedCaseId) || null,
    [context, selectedCaseId]
  );

  const loadThreadDetail = useCallback(async (threadId: string, markRead = true) => {
    const response = await portalApi.get<ThreadDetailResponse>(`/v2/portal/messages/threads/${threadId}`);
    setActiveThread((current) => {
      const next = unwrapApiData(response.data);
      const failedMessages =
        current?.thread.id === threadId
          ? current.messages.filter((message) => message.send_state === 'failed')
          : [];
      return {
        ...next,
        messages: mergeThreadMessages([...failedMessages, ...next.messages]),
      };
    });
    setActiveThreadId(threadId);

    if (markRead) {
      await portalApi.post(`/v2/portal/messages/threads/${threadId}/read`);
    }
  }, []);

  const {
    threads,
    loading: threadsLoading,
    loadingMore,
    hasMore,
    error: threadsError,
    streamStatus,
    refresh: refreshThreads,
    loadMore,
  } = usePortalMessageThreads({
    statusFilter: threadStatusFilter,
    search: threadSearch,
    selectedCaseId,
    caseFilter: threadCaseFilter,
    onRealtimeEvent: (_eventName, payload) => {
      const thread = payload.thread;
      if (!activeThreadId || payload.entity_id !== activeThreadId || !thread) {
        return;
      }

      setActiveThread((current) =>
        current
          ? {
              thread: {
                ...current.thread,
                subject: thread.subject,
                status: thread.status as ThreadSummary['status'],
                case_number: thread.case_number,
                case_title: thread.case_title,
                pointperson_first_name: thread.pointperson_first_name,
                pointperson_last_name: thread.pointperson_last_name,
                unread_count: thread.portal_unread_count,
                last_message_at: thread.last_message_at,
                last_message_preview: thread.last_message_preview,
              },
              messages: payload.message
                ? mergeThreadMessages([
                    ...current.messages,
                    {
                      ...payload.message,
                      send_state: 'sent',
                      send_error: null,
                      optimistic: false,
                    },
                  ])
                : current.messages,
            }
          : current
      );
    },
  });

  const streamBadge = useMemo(() => getStreamStatusBadge(streamStatus), [streamStatus]);

  const loadContext = useCallback(async () => {
    const response = await portalApi.get<PointpersonContextPayload>('/v2/portal/pointperson/context');
    const payload = unwrapApiData(response.data);
    setContext(payload);

    const caseIds = new Set(payload.cases.map((entry) => entry.case_id));
    const fallbackCaseId =
      (selectedCaseId && caseIds.has(selectedCaseId) ? selectedCaseId : null) ||
      (payload.selected_case_id && caseIds.has(payload.selected_case_id) ? payload.selected_case_id : null) ||
      (payload.default_case_id && caseIds.has(payload.default_case_id) ? payload.default_case_id : null) ||
      payload.cases[0]?.case_id ||
      '';

    if (fallbackCaseId) {
      setSelectedCaseId(fallbackCaseId);
    } else {
      clearSelectedCaseId();
    }
  }, [clearSelectedCaseId, selectedCaseId, setSelectedCaseId]);

  const loadInitial = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await Promise.all([loadContext(), refreshThreads()]);
    } catch (loadError) {
      console.error('Failed to load portal messaging context', loadError);
      setError('Unable to load messages right now.');
    } finally {
      setLoading(false);
    }
  }, [loadContext, refreshThreads]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    const threadStillVisible = threads.some((thread) => thread.id === activeThreadId);
    if (!threadStillVisible) {
      setActiveThreadId(null);
      setActiveThread(null);
      setReplyMessage('');
    }
  }, [activeThreadId, threads]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCaseId) {
      showError('Select a case before sending.');
      return;
    }

    if (!selectedCase?.is_messageable) {
      showError('This case does not have an assigned pointperson yet.');
      return;
    }

    if (!newMessage.trim()) {
      showError('Enter a message before sending.');
      return;
    }

    setCreating(true);
    try {
      const response = await portalApi.post<ThreadDetailResponse>('/v2/portal/messages/threads', {
        case_id: selectedCaseId,
        subject: newSubject.trim() || null,
        message: newMessage.trim(),
      });

      const created = unwrapApiData(response.data);
      setNewSubject('');
      setNewMessage('');
      clearNewMessageDraft();
      setActiveThread(created);
      setActiveThreadId(created.thread.id);
      showSuccess('Message sent to your pointperson.');
      await refreshThreads();
    } catch (createError) {
      console.error('Failed to create thread', createError);
      showError('Could not send message.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenThread = async (threadId: string) => {
    try {
      await loadThreadDetail(threadId, true);
      await refreshThreads();
    } catch (detailError) {
      console.error('Failed to load thread detail', detailError);
      showError('Could not load this conversation.');
    }
  };

  const submitReply = useCallback(
    async (input: {
      body: string;
      clientMessageId?: string;
      preserveDraft?: boolean;
    } = { body: replyMessage }): Promise<void> => {
      if (!activeThreadId || !input.body.trim()) {
        return;
      }

      const clientMessageId = input.clientMessageId || createClientMessageId();
      const optimisticMessage: MessageEntry = {
        id: `${TEMP_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        sender_type: 'portal',
        message_text: input.body.trim(),
        sender_display_name: 'You',
        client_message_id: clientMessageId,
        created_at: new Date().toISOString(),
        send_state: 'sending',
        send_error: null,
        optimistic: true,
      };

      setReplying(true);
      try {
        setActiveThread((current) =>
          current
            ? {
                ...current,
                messages: mergeThreadMessages([...current.messages, optimisticMessage]),
              }
            : current
        );

        const response = await portalApi.post<{ message: MessageEntry }>(
          `/v2/portal/messages/threads/${activeThreadId}/messages`,
          {
            message: input.body.trim(),
            client_message_id: clientMessageId,
          }
        );
        const createdMessage = unwrapApiData(response.data).message;
        setReplyMessage('');
        if (!input.preserveDraft) {
          clearReplyMessageDraft();
        }
        setActiveThread((current) =>
          current
            ? {
                ...current,
                messages: mergeThreadMessages(
                  current.messages.map((message) =>
                    message.client_message_id === clientMessageId
                      ? {
                          ...createdMessage,
                          send_state: 'sent',
                          send_error: null,
                          optimistic: false,
                        }
                      : message
                  )
                ),
              }
            : current
        );
        await refreshThreads();
      } catch (replyError) {
        setActiveThread((current) =>
          current
            ? {
                ...current,
                messages: mergeThreadMessages(
                  current.messages.map((message) =>
                    message.client_message_id === clientMessageId
                      ? {
                          ...message,
                          send_state: 'failed',
                          send_error: replyError instanceof Error ? replyError.message : 'Could not send reply.',
                          optimistic: true,
                        }
                      : message
                  )
                ),
              }
            : current
        );
        console.error('Failed to reply in thread', replyError);
        showError('Could not send reply.');
      } finally {
        setReplying(false);
      }
    },
    [activeThreadId, clearReplyMessageDraft, refreshThreads, replyMessage, showError]
  );

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitReply();
  };

  const handleToggleThreadStatus = async () => {
    if (!activeThreadId || !activeThread) {
      return;
    }

    const nextStatus = activeThread.thread.status === 'open' ? 'closed' : 'open';
    try {
      await portalApi.patch(`/v2/portal/messages/threads/${activeThreadId}`, {
        status: nextStatus,
      });
      showSuccess(nextStatus === 'closed' ? 'Conversation closed.' : 'Conversation reopened.');
      await loadThreadDetail(activeThreadId, false);
      await refreshThreads();
    } catch (statusError) {
      console.error('Failed to update thread status', statusError);
      showError('Could not update conversation status.');
    }
  };

  const composerBlocked = selectedCase ? !selectedCase.is_messageable : true;
  const resolvedError = error || threadsError;

  return (
    <PortalPageShell
      title="Messages"
      description="Send and track secure conversations with your assigned pointperson."
    >
      <PortalPageState
        loading={loading}
        error={resolvedError}
        empty={false}
        loadingLabel="Loading messages..."
        onRetry={loadInitial}
      />

      {!loading && !resolvedError && (
        <div className="space-y-4">
          <section className="rounded-lg border border-app-border bg-app-surface p-4">
            <h3 className="text-base font-semibold text-app-text">New Message</h3>
            <p className="mt-1 text-sm text-app-text-muted">
              Messages are sent to your assigned case pointperson.
            </p>

            <form onSubmit={handleCreateThread} className="mt-4 space-y-3">
              <div>
                <label htmlFor="portal-message-case" className="mb-1 block text-sm font-medium text-app-text-label">Case</label>
                <select
                  id="portal-message-case"
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                >
                  {context?.cases.length ? (
                    context.cases.map((caseEntry) => (
                      <option key={caseEntry.case_id} value={caseEntry.case_id}>
                        {caseEntry.case_number} - {caseEntry.case_title}
                        {caseEntry.is_messageable ? '' : ' (No pointperson assigned)'}
                      </option>
                    ))
                  ) : (
                    <option value="">No active cases</option>
                  )}
                </select>
                {selectedCase && !selectedCase.is_messageable && (
                  <p className="mt-1 text-xs text-app-accent">
                    This case has no assigned pointperson yet. Ask staff to assign one before messaging.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="portal-message-subject" className="mb-1 block text-sm font-medium text-app-text-label">Subject (optional)</label>
                <input
                  id="portal-message-subject"
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Quick summary"
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="portal-message-body" className="mb-1 block text-sm font-medium text-app-text-label">Message</label>
                <textarea
                  id="portal-message-body"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setNewMessageDraft(e.target.value);
                  }}
                  rows={4}
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                  placeholder="Type your message"
                />
              </div>

              <button
                type="submit"
                disabled={creating || composerBlocked || !context?.cases.length}
                className="rounded-md bg-app-accent px-4 py-2 text-white disabled:opacity-50"
              >
                {creating ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-lg border border-app-border bg-app-surface">
              <div className="space-y-3 border-b border-app-border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-app-text">Conversations</h3>
                  <span className={`rounded px-2 py-1 text-xs ${streamBadge.className}`}>
                    {streamBadge.label}
                  </span>
                </div>
                <input
                  aria-label="Search conversations"
                  value={threadSearch}
                  onChange={(event) => setThreadSearch(event.target.value)}
                  placeholder="Search conversations"
                  className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
                />
                <select
                  aria-label="Filter conversations by status"
                  value={threadStatusFilter}
                  onChange={(event) =>
                    setThreadStatusFilter(event.target.value as ThreadStatusFilter)
                  }
                  className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  aria-label="Filter conversations by case scope"
                  value={threadCaseFilter}
                  onChange={(event) => setThreadCaseFilter(event.target.value as ThreadCaseFilter)}
                  className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
                >
                  <option value="selected">Selected case only</option>
                  <option value="all">All accessible cases</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    void refreshThreads();
                  }}
                  className="w-full rounded-md border border-app-input-border px-3 py-2 text-xs"
                >
                  Refresh
                </button>
              </div>
              <div className="max-h-[560px] overflow-y-auto p-3">
                {threadsLoading && threads.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-app-text-muted">Loading conversations...</p>
                ) : threads.length === 0 ? (
                  <p className="px-2 py-6 text-sm text-app-text-muted">
                    {threadSearch || threadStatusFilter !== 'all' || threadCaseFilter !== 'selected'
                      ? 'No conversations match your filters.'
                      : 'No conversations yet.'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {threads.map((thread) => {
                      const isActive = activeThreadId === thread.id;
                      return (
                        <li key={thread.id}>
                          <button
                            type="button"
                            onClick={() => {
                              void handleOpenThread(thread.id);
                            }}
                            className={`block w-full rounded-md text-left ${
                              isActive ? 'ring-2 ring-app-accent' : ''
                            }`}
                          >
                            <PortalListCard
                              title={thread.subject || thread.case_title || 'Conversation'}
                              subtitle={`${thread.case_number || 'No case'} • ${thread.pointperson_first_name || 'Staff'} ${thread.pointperson_last_name || ''}`}
                              meta={formatTimestamp(thread.last_message_at)}
                              badges={
                                thread.unread_count > 0 ? (
                                  <span className="rounded-full bg-app-accent px-2 py-0.5 text-xs text-white">
                                    {thread.unread_count} unread
                                  </span>
                                ) : (
                                  <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                                    {thread.status}
                                  </span>
                                )
                              }
                            >
                              <p className="line-clamp-2 text-xs text-app-text-muted">
                                {thread.last_message_preview || 'No preview'}
                              </p>
                            </PortalListCard>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {hasMore && (
                <div className="border-t border-app-border p-3">
                  <button
                    type="button"
                    onClick={() => {
                      void loadMore();
                    }}
                    disabled={loadingMore}
                    className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-app-border bg-app-surface">
              {!activeThread ? (
                <div className="px-6 py-12 text-center text-sm text-app-text-muted">
                  Select a conversation to view messages.
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-app-text">
                        {activeThread.thread.subject || activeThread.thread.case_title || 'Conversation'}
                      </div>
                      <div className="text-xs text-app-text-muted">Status: {activeThread.thread.status}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void handleToggleThreadStatus();
                      }}
                      className="rounded-md border border-app-input-border px-3 py-1 text-xs"
                    >
                      {activeThread.thread.status === 'open' ? 'Close' : 'Reopen'}
                    </button>
                  </div>

                  <div className="max-h-[420px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    {activeThread.messages.length === 0 ? (
                      <p className="text-sm text-app-text-muted">No messages in this thread yet.</p>
                    ) : (
                      activeThread.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${
                            message.sender_type === 'portal'
                              ? 'ml-auto bg-app-accent text-white'
                              : 'bg-app-surface-muted text-app-text'
                          }`}
                        >
                          <div className="text-[11px] opacity-80">
                            {message.sender_display_name ||
                              (message.sender_type === 'portal' ? 'You' : 'Staff')}{' '}
                            • {formatTimestamp(message.created_at)}
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
                      ))
                    )}
                  </div>

                  <form onSubmit={handleReply} className="border-t border-app-border p-4">
                    <textarea
                      aria-label="Reply to conversation"
                      value={replyMessage}
                      onChange={(e) => {
                        setReplyMessage(e.target.value);
                        setReplyMessageDraft(e.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (shouldSubmitComposer(event)) {
                          event.preventDefault();
                          void submitReply();
                        }
                      }}
                      rows={3}
                      placeholder={
                        activeThread.thread.status === 'open'
                          ? 'Reply to this conversation'
                          : 'Reopen this conversation to reply'
                      }
                      disabled={activeThread.thread.status !== 'open'}
                      className="w-full rounded-md border border-app-input-border px-3 py-2"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={replying || activeThread.thread.status !== 'open' || !replyMessage.trim()}
                        className="rounded-md bg-app-accent px-4 py-2 text-white disabled:opacity-50"
                      >
                        {replying ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </PortalPageShell>
  );
}
