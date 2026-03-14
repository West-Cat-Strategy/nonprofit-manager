import type { PortalSectionProps } from '../../adminSettings/sections/PortalSection';

type PortalPanelProps = Omit<PortalSectionProps, 'visiblePanels'>;

const getStreamStatusBadge = (
  status: PortalPanelProps['portalStreamStatus']
): { label: string; className: string } => {
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

export default function ConversationsPanel({
  portalStreamStatus,
  portalConversationFilters,
  onPortalConversationFilterChange,
  portalConversationsLoading,
  portalConversationsLoadingMore,
  portalConversationsHasMore,
  portalConversations,
  selectedPortalConversation,
  portalConversationReply,
  portalConversationReplyInternal,
  portalConversationReplyLoading,
  onRefreshPortalConversations,
  onLoadMorePortalConversations,
  onOpenPortalConversation,
  onPortalConversationReplyChange,
  onPortalConversationReplyInternalChange,
  onSendPortalConversationReply,
  onUpdatePortalConversationStatus,
}: PortalPanelProps) {
  const streamBadge = getStreamStatusBadge(portalStreamStatus);

  return (
    <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-app-text-heading">Portal Conversations</h3>
            <p className="text-sm text-app-text-muted mt-1">
              Reply to client threads and keep conversation history in sync with case detail.
            </p>
          </div>
          <span className={`px-2 py-1 text-xs rounded ${streamBadge.className}`}>
            {streamBadge.label}
          </span>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="text"
            aria-label="Search portal conversations"
            value={portalConversationFilters.search}
            onChange={(event) => onPortalConversationFilterChange('search', event.target.value)}
            placeholder="Search conversations"
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <select
            aria-label="Filter portal conversations by status"
            value={portalConversationFilters.status}
            onChange={(event) => onPortalConversationFilterChange('status', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
          <input
            type="text"
            aria-label="Filter portal conversations by case ID"
            value={portalConversationFilters.caseId}
            onChange={(event) => onPortalConversationFilterChange('caseId', event.target.value)}
            placeholder="Case ID"
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="text"
            aria-label="Filter portal conversations by pointperson user ID"
            value={portalConversationFilters.pointpersonUserId}
            onChange={(event) =>
              onPortalConversationFilterChange('pointpersonUserId', event.target.value)
            }
            placeholder="Pointperson user ID"
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <button
            type="button"
            onClick={onRefreshPortalConversations}
            className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
          >
            Refresh Conversations
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          <div className="border border-app-border rounded-lg overflow-hidden">
            {portalConversationsLoading && portalConversations.length === 0 ? (
              <p className="p-4 text-sm text-app-text-muted">Loading conversations...</p>
            ) : portalConversations.length === 0 ? (
              <p className="p-4 text-sm text-app-text-muted">No portal conversations yet.</p>
            ) : (
              <div>
                <ul className="max-h-[420px] overflow-y-auto divide-y divide-app-border">
                  {portalConversations.map((conversation) => (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => onOpenPortalConversation(conversation.id)}
                        className={`w-full px-3 py-3 text-left hover:bg-app-surface-muted ${
                          selectedPortalConversation?.thread.id === conversation.id
                            ? 'bg-app-surface-muted'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-app-text">
                            {conversation.subject || conversation.case_title || 'Conversation'}
                          </div>
                          {conversation.unread_count > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-app-accent text-white text-xs">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-app-text-muted mt-1">
                          {conversation.portal_email || 'Client'} • {conversation.status}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {portalConversationsHasMore && (
                  <div className="p-3 border-t border-app-border">
                    <button
                      type="button"
                      onClick={onLoadMorePortalConversations}
                      disabled={portalConversationsLoadingMore}
                      className="w-full px-3 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                    >
                      {portalConversationsLoadingMore ? 'Loading...' : 'Load More Conversations'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border border-app-border rounded-lg p-4">
            {!selectedPortalConversation ? (
              <p className="text-sm text-app-text-muted">Select a conversation to reply.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-app-text">
                      {selectedPortalConversation.thread.subject || 'Conversation'}
                    </div>
                    <div className="text-xs text-app-text-muted">
                      {selectedPortalConversation.thread.portal_email || 'Client'} •{' '}
                      {selectedPortalConversation.thread.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePortalConversationStatus(
                        selectedPortalConversation.thread.id,
                        selectedPortalConversation.thread.status === 'open' ? 'closed' : 'open'
                      )
                    }
                    className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
                  >
                    {selectedPortalConversation.thread.status === 'open' ? 'Close' : 'Reopen'}
                  </button>
                </div>

                <div className="max-h-[260px] overflow-y-auto space-y-3 border border-app-border rounded-lg p-3">
                  {selectedPortalConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        message.sender_type === 'staff'
                          ? 'bg-app-accent-soft text-app-accent-text'
                          : 'bg-app-surface-muted text-app-text'
                      }`}
                    >
                      <div className="text-[11px] text-app-text-muted">
                        {message.sender_display_name || message.sender_type} •{' '}
                        {new Date(message.created_at).toLocaleString()}
                        {message.is_internal && ' • Internal'}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">{message.message_text}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <textarea
                    aria-label="Reply to portal conversation"
                    value={portalConversationReply}
                    onChange={(event) => onPortalConversationReplyChange(event.target.value)}
                    rows={3}
                    placeholder="Reply to client"
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg"
                    disabled={selectedPortalConversation.thread.status !== 'open'}
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
                    <input
                      type="checkbox"
                      checked={portalConversationReplyInternal}
                      onChange={(event) => onPortalConversationReplyInternalChange(event.target.checked)}
                      className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                    />
                    Internal note (not visible to client)
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onSendPortalConversationReply}
                      disabled={
                        portalConversationReplyLoading ||
                        selectedPortalConversation.thread.status !== 'open' ||
                        !portalConversationReply.trim()
                      }
                      className="px-4 py-2 text-sm bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
                    >
                      {portalConversationReplyLoading ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
