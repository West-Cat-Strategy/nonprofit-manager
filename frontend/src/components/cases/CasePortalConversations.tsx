import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/useToast';

interface PortalMessage {
  id: string;
  sender_type: 'portal' | 'staff' | 'system';
  message_text: string;
  created_at: string;
  sender_display_name: string | null;
  is_internal: boolean;
}

interface PortalThread {
  id: string;
  subject: string | null;
  status: 'open' | 'closed' | 'archived';
  case_number: string | null;
  case_title: string | null;
  last_message_at: string;
  unread_count: number;
  portal_email: string | null;
}

interface CaseConversation {
  thread: PortalThread;
  messages: PortalMessage[];
}

interface CasePortalConversationsProps {
  caseId: string;
}

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function CasePortalConversations({ caseId }: CasePortalConversationsProps) {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conversations, setConversations] = useState<CaseConversation[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((entry) => entry.thread.id === selectedThreadId) || null,
    [conversations, selectedThreadId]
  );

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ conversations: CaseConversation[] }>(
        `/cases/${caseId}/portal/conversations`
      );
      const nextConversations = response.data.conversations || [];
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
  };

  useEffect(() => {
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedConversation || !replyMessage.trim()) {
      return;
    }

    setSaving(true);
    try {
      await api.post(`/cases/${caseId}/portal/conversations/${selectedConversation.thread.id}/messages`, {
        message: replyMessage.trim(),
        is_internal: replyInternal,
      });
      setReplyMessage('');
      setReplyInternal(false);
      showSuccess('Reply sent.');
      await loadConversations();
    } catch (error) {
      console.error('Failed to send portal conversation reply', error);
      showError('Could not send reply.');
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
                      <span className="rounded-full bg-app-accent px-2 py-0.5 text-xs text-white">
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
              <div className="text-sm font-semibold text-app-text">
                {selectedConversation.thread.subject || 'Conversation'}
              </div>
              <div className="text-xs text-app-text-muted">
                {selectedConversation.thread.portal_email || 'Portal user'} • {selectedConversation.thread.status}
              </div>
            </div>

            <div className="max-h-[420px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                    message.sender_type === 'staff'
                      ? 'ml-auto bg-app-accent text-white'
                      : 'bg-app-surface-muted text-app-text'
                  }`}
                >
                  <div className="text-[11px] opacity-80">
                    {message.sender_display_name || (message.sender_type === 'staff' ? 'Staff' : 'Client')} •{' '}
                    {formatTimestamp(message.created_at)}
                    {message.is_internal && ' • Internal'}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{message.message_text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleReply} className="border-t border-app-border p-4 space-y-3">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={3}
                placeholder="Reply to this conversation"
                className="w-full rounded-md border border-app-input-border px-3 py-2"
                disabled={selectedConversation.thread.status !== 'open'}
              />
              <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
                <input
                  type="checkbox"
                  checked={replyInternal}
                  onChange={(e) => setReplyInternal(e.target.checked)}
                  className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                />
                Internal note (not visible to client)
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || selectedConversation.thread.status !== 'open' || !replyMessage.trim()}
                  className="rounded-md bg-app-accent px-4 py-2 text-white disabled:opacity-50"
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
