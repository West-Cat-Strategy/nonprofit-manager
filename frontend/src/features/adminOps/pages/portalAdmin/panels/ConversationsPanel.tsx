import { useEffect, useState } from 'react';
import { shouldSubmitComposer } from '../../../../../features/messaging/composer';
import {
  type AdminStatusTone,
  AdminFilterToolbar,
  AdminMetricGrid,
  AdminMetricTile,
  AdminStatusPill,
  AdminWorkspaceSection,
  adminControlClassName,
  adminPrimaryButtonClassName,
  adminSubtleButtonClassName,
} from '../../../components/AdminWorkspacePrimitives';
import LoadFailureNotice from './LoadFailureNotice';
import type { PortalPanelProps } from '../panelTypes';

const getStreamStatusBadge = (
  status: PortalPanelProps['portalStreamStatus']
): { label: string; tone: AdminStatusTone } => {
  if (status === 'connected') {
    return {
      label: 'Live updates on',
      tone: 'success',
    };
  }

  if (status === 'connecting') {
    return {
      label: 'Connecting live updates...',
      tone: 'info',
    };
  }

  if (status === 'error') {
    return {
      label: 'Live updates unavailable (polling)',
      tone: 'warning',
    };
  }

  return {
    label: 'Live updates disabled (polling)',
    tone: 'neutral',
  };
};

export default function ConversationsPanel({
  portalStreamStatus,
  portalConversationFilters,
  onPortalConversationFilterChange,
  portalConversationsLoading,
  portalConversationsError,
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
  onRetryPortalConversationReply,
  onUpdatePortalConversationStatus,
}: PortalPanelProps) {
  const [mobileConversationView, setMobileConversationView] = useState<'list' | 'detail'>('list');
  const streamBadge = getStreamStatusBadge(portalStreamStatus);
  const visibleConversationCount = portalConversations.length;
  const openConversationCount = portalConversations.filter(
    (conversation) => conversation.status === 'open'
  ).length;
  const unreadMessageCount = portalConversations.reduce(
    (total, conversation) => total + conversation.unread_count,
    0
  );
  const caseLinkedConversationCount = portalConversations.filter((conversation) =>
    Boolean(conversation.case_id)
  ).length;
  const showMobileDetail = Boolean(selectedPortalConversation) && mobileConversationView === 'detail';

  useEffect(() => {
    if (!selectedPortalConversation) {
      setMobileConversationView('list');
    }
  }, [selectedPortalConversation]);

  return (
    <AdminWorkspaceSection
      title="Portal Conversations"
      description="Reply to client threads and keep conversation history in sync with case detail."
      actions={<AdminStatusPill tone={streamBadge.tone}>{streamBadge.label}</AdminStatusPill>}
    >
      <AdminFilterToolbar>
        <input
          type="text"
          aria-label="Search portal conversations"
          value={portalConversationFilters.search}
          onChange={(event) => onPortalConversationFilterChange('search', event.target.value)}
          placeholder="Search conversations"
          className={adminControlClassName}
        />
        <select
          aria-label="Filter portal conversations by status"
          value={portalConversationFilters.status}
          onChange={(event) => onPortalConversationFilterChange('status', event.target.value)}
          className={adminControlClassName}
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
          className={adminControlClassName}
        />
        <input
          type="text"
          aria-label="Filter portal conversations by pointperson user ID"
          value={portalConversationFilters.pointpersonUserId}
          onChange={(event) =>
            onPortalConversationFilterChange('pointpersonUserId', event.target.value)
          }
          placeholder="Pointperson user ID"
          className={adminControlClassName}
        />
        <button
          type="button"
          onClick={onRefreshPortalConversations}
          className={adminSubtleButtonClassName}
        >
          Refresh Conversations
        </button>
      </AdminFilterToolbar>
      {!portalConversationsLoading && (
        <AdminMetricGrid>
          <AdminMetricTile label="Visible" value={visibleConversationCount} />
          <AdminMetricTile
            label="Open"
            value={openConversationCount}
            tone={openConversationCount ? 'info' : 'neutral'}
          />
          <AdminMetricTile
            label="Unread"
            value={unreadMessageCount}
            tone={unreadMessageCount ? 'warning' : 'neutral'}
          />
          <AdminMetricTile label="Case linked" value={caseLinkedConversationCount} />
        </AdminMetricGrid>
      )}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div
          id="portal-conversation-list"
          className={`min-w-0 overflow-hidden rounded-lg border border-app-border ${
            showMobileDetail ? 'hidden lg:block' : ''
          }`}
        >
          {portalConversationsError ? (
            <div className="border-b border-app-border p-3">
              <LoadFailureNotice
                title={portalConversations.length ? 'Partial load' : 'Load failed'}
                message={portalConversationsError}
              />
            </div>
          ) : null}
          {portalConversationsLoading && portalConversations.length === 0 ? (
            <p className="p-4 text-sm text-app-text-muted">Loading conversations...</p>
          ) : portalConversations.length === 0 && !portalConversationsError ? (
            <p className="p-4 text-sm text-app-text-muted">No portal conversations yet.</p>
          ) : portalConversations.length > 0 ? (
            <div>
              <ul className="max-h-[420px] overflow-y-auto divide-y divide-app-border">
                {portalConversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                    onClick={() => {
                      onOpenPortalConversation(conversation.id);
                      setMobileConversationView('detail');
                    }}
                    aria-pressed={selectedPortalConversation?.thread.id === conversation.id}
                      className={`w-full min-w-0 px-3 py-3 text-left hover:bg-app-surface-muted ${
                        selectedPortalConversation?.thread.id === conversation.id
                          ? 'bg-app-surface-muted'
                          : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="min-w-0 break-words text-sm font-medium text-app-text">
                          {conversation.subject || conversation.case_title || 'Conversation'}
                        </div>
                        {conversation.unread_count > 0 && (
                          <span className="shrink-0 rounded-full bg-app-accent px-2 py-0.5 text-xs text-[var(--app-accent-foreground)]">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 break-words text-xs text-app-text-muted">
                        {conversation.portal_email || 'Client'} • {conversation.status}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <AdminStatusPill tone="neutral">
                          {conversation.case_id ? 'Case-linked' : 'General portal thread'}
                        </AdminStatusPill>
                        {conversation.status === 'open' && (
                          <AdminStatusPill tone="success">Reply available</AdminStatusPill>
                        )}
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
                    className={adminSubtleButtonClassName}
                  >
                    {portalConversationsLoadingMore ? 'Loading...' : 'Load More Conversations'}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div
          className={`min-w-0 rounded-lg border border-app-border p-4 ${
            showMobileDetail ? '' : 'hidden lg:block'
          }`}
        >
          {!selectedPortalConversation ? (
            <p className="text-sm text-app-text-muted">Select a conversation to reply.</p>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setMobileConversationView('list')}
                className={`${adminSubtleButtonClassName} lg:hidden`}
              >
                Back to conversations
              </button>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="break-words text-sm font-semibold text-app-text">
                    {selectedPortalConversation.thread.subject || 'Conversation'}
                  </div>
                  <div className="break-words text-xs text-app-text-muted">
                    {selectedPortalConversation.thread.portal_email || 'Client'} •{' '}
                    {selectedPortalConversation.thread.status}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <AdminStatusPill tone="neutral">
                      {selectedPortalConversation.thread.case_id ? 'Case-linked' : 'No linked case'}
                    </AdminStatusPill>
                    {selectedPortalConversation.thread.unread_count > 0 && (
                      <AdminStatusPill tone="warning">
                        {selectedPortalConversation.thread.unread_count} unread
                      </AdminStatusPill>
                    )}
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
                  className={adminSubtleButtonClassName}
                >
                  {selectedPortalConversation.thread.status === 'open' ? 'Close' : 'Reopen'}
                </button>
              </div>

              <div className="max-h-[260px] min-w-0 space-y-3 overflow-y-auto rounded-lg border border-app-border p-3">
                {selectedPortalConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`min-w-0 rounded-lg px-3 py-2 text-sm ${
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
                    <div className="mt-1 whitespace-pre-wrap break-words">
                      {message.message_text}
                    </div>
                    {(message.send_state === 'sending' || message.send_state === 'failed') && (
                      <div className="mt-2 text-[11px] text-app-text-muted">
                        {message.send_state === 'sending' ? 'Sending...' : 'Failed to send'}
                      </div>
                    )}
                    {message.send_state === 'failed' && (
                      <button
                        type="button"
                        onClick={() => onRetryPortalConversationReply(message.id)}
                        className="mt-2 rounded border border-current px-2 py-1 text-[11px] font-semibold"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <textarea
                  aria-label="Reply to portal conversation"
                  value={portalConversationReply}
                  onChange={(event) => onPortalConversationReplyChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (shouldSubmitComposer(event)) {
                      event.preventDefault();
                      onSendPortalConversationReply();
                    }
                  }}
                  rows={3}
                  placeholder="Reply to client"
                  className={adminControlClassName}
                  disabled={selectedPortalConversation.thread.status !== 'open'}
                />
                <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
                  <input
                    type="checkbox"
                    checked={portalConversationReplyInternal}
                    onChange={(event) =>
                      onPortalConversationReplyInternalChange(event.target.checked)
                    }
                    className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                  />
                  Internal note (not visible to client)
                </label>
                <div className="flex justify-stretch sm:justify-end">
                  <button
                    type="button"
                    onClick={onSendPortalConversationReply}
                    disabled={
                      portalConversationReplyLoading ||
                      selectedPortalConversation.thread.status !== 'open' ||
                      !portalConversationReply.trim()
                    }
                    className={adminPrimaryButtonClassName}
                  >
                    {portalConversationReplyLoading ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminWorkspaceSection>
  );
}
