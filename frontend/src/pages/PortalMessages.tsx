import { useEffect, useMemo, useState } from 'react';
import portalApi from '../services/portalApi';
import { useToast } from '../contexts/useToast';
import PortalPageState from '../components/portal/PortalPageState';

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
  created_at: string;
}

interface ThreadDetailResponse {
  thread: ThreadSummary;
  messages: MessageEntry[];
}

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function PortalMessages() {
  const { showSuccess, showError } = useToast();
  const [context, setContext] = useState<PointpersonContextPayload | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ThreadDetailResponse | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  const selectedCase = useMemo(
    () => context?.cases.find((entry) => entry.case_id === selectedCaseId) || null,
    [context, selectedCaseId]
  );

  const loadContext = async () => {
    const response = await portalApi.get<PointpersonContextPayload>('/portal/pointperson/context');
    const payload = response.data;
    setContext(payload);

    const fallbackCaseId = payload.selected_case_id || payload.default_case_id || payload.cases[0]?.case_id || '';
    if (!selectedCaseId) {
      setSelectedCaseId(fallbackCaseId);
    }
  };

  const loadThreads = async () => {
    setThreadsLoading(true);
    try {
      const response = await portalApi.get<{ threads: ThreadSummary[] }>('/portal/messages/threads');
      setThreads(response.data.threads || []);
    } finally {
      setThreadsLoading(false);
    }
  };

  const loadThreadDetail = async (threadId: string) => {
    const response = await portalApi.get<ThreadDetailResponse>(`/portal/messages/threads/${threadId}`);
    setActiveThread(response.data);
    setActiveThreadId(threadId);
    await portalApi.post(`/portal/messages/threads/${threadId}/read`);
    await loadThreads();
  };

  const loadInitial = async () => {
    try {
      setError(null);
      setLoading(true);
      await Promise.all([loadContext(), loadThreads()]);
    } catch (err) {
      console.error('Failed to load portal messaging context', err);
      setError('Unable to load messages right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const response = await portalApi.post<ThreadDetailResponse>('/portal/messages/threads', {
        case_id: selectedCaseId,
        subject: newSubject.trim() || null,
        message: newMessage.trim(),
      });

      const created = response.data;
      setNewSubject('');
      setNewMessage('');
      setActiveThread(created);
      setActiveThreadId(created.thread.id);
      showSuccess('Message sent to your pointperson.');
      await loadThreads();
    } catch (err) {
      console.error('Failed to create thread', err);
      showError('Could not send message.');
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeThreadId || !replyMessage.trim()) {
      return;
    }

    setReplying(true);
    try {
      await portalApi.post(`/portal/messages/threads/${activeThreadId}/messages`, {
        message: replyMessage.trim(),
      });
      setReplyMessage('');
      await loadThreadDetail(activeThreadId);
    } catch (err) {
      console.error('Failed to reply in thread', err);
      showError('Could not send reply.');
    } finally {
      setReplying(false);
    }
  };

  const handleToggleThreadStatus = async () => {
    if (!activeThreadId || !activeThread) {
      return;
    }

    const nextStatus = activeThread.thread.status === 'open' ? 'closed' : 'open';
    try {
      await portalApi.patch(`/portal/messages/threads/${activeThreadId}`, {
        status: nextStatus,
      });
      showSuccess(nextStatus === 'closed' ? 'Conversation closed.' : 'Conversation reopened.');
      await loadThreadDetail(activeThreadId);
    } catch (err) {
      console.error('Failed to update thread status', err);
      showError('Could not update conversation status.');
    }
  };

  const composerBlocked = selectedCase ? !selectedCase.is_messageable : true;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-app-text">Messages</h2>

      <PortalPageState
        loading={loading}
        error={error}
        empty={false}
        loadingLabel="Loading messages..."
        onRetry={loadInitial}
      />

      {!loading && !error && (
        <>
          <section className="rounded-lg border border-app-border bg-app-surface p-4">
            <h3 className="text-lg font-medium text-app-text">New Message</h3>
            <p className="mt-1 text-sm text-app-text-muted">
              Messages are sent to your assigned case pointperson.
            </p>

            <form onSubmit={handleCreateThread} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-app-text-label mb-1">Case</label>
                <select
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
                  <p className="mt-1 text-xs text-red-600">
                    This case has no assigned pointperson yet. Ask staff to assign one before messaging.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text-label mb-1">Subject (optional)</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Quick summary"
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text-label mb-1">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
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

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
            <div className="rounded-lg border border-app-border bg-app-surface">
              <div className="border-b border-app-border px-4 py-3">
                <h3 className="text-sm font-semibold text-app-text">Conversations</h3>
              </div>
              <div className="max-h-[540px] overflow-y-auto">
                {threadsLoading ? (
                  <p className="px-4 py-3 text-sm text-app-text-muted">Refreshing...</p>
                ) : threads.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-app-text-muted">No conversations yet.</p>
                ) : (
                  <ul>
                    {threads.map((thread) => {
                      const isActive = activeThreadId === thread.id;
                      return (
                        <li key={thread.id}>
                          <button
                            type="button"
                            onClick={() => loadThreadDetail(thread.id)}
                            className={`w-full border-b border-app-border px-4 py-3 text-left hover:bg-app-surface-muted ${
                              isActive ? 'bg-app-surface-muted' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium text-app-text">
                                  {thread.subject || thread.case_title || 'Conversation'}
                                </div>
                                <div className="text-xs text-app-text-muted">
                                  {thread.case_number || 'No case'} • {thread.pointperson_first_name || 'Staff'}{' '}
                                  {thread.pointperson_last_name || ''}
                                </div>
                              </div>
                              {thread.unread_count > 0 && (
                                <span className="rounded-full bg-app-accent px-2 py-0.5 text-xs text-white">
                                  {thread.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-app-text-muted">
                              {thread.last_message_preview || 'No preview'}
                            </p>
                            <div className="mt-1 text-[11px] text-app-text-subtle">
                              {formatTimestamp(thread.last_message_at)}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
                      <div className="text-xs text-app-text-muted">
                        Status: {activeThread.thread.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleThreadStatus}
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
                          className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                            message.sender_type === 'portal'
                              ? 'ml-auto bg-app-accent text-white'
                              : 'bg-app-surface-muted text-app-text'
                          }`}
                        >
                          <div className="text-[11px] opacity-80">
                            {message.sender_display_name || (message.sender_type === 'portal' ? 'You' : 'Staff')} •{' '}
                            {formatTimestamp(message.created_at)}
                          </div>
                          <div className="mt-1 whitespace-pre-wrap">{message.message_text}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleReply} className="border-t border-app-border p-4">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
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
        </>
      )}
    </div>
  );
}
