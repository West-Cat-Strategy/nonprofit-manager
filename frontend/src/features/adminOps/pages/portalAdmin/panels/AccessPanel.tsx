import ErrorBanner from '../../../../../components/ErrorBanner';
import type { PortalSectionProps } from '../../adminSettings/sections/PortalSection';

type PortalPanelProps = Omit<PortalSectionProps, 'visiblePanels'>;

export default function AccessPanel({
  portalInviteUrl,
  portalLoading,
  portalRequests,
  portalInviteEmail,
  portalContactSearch,
  portalContactLoading,
  portalContactResults,
  selectedPortalContact,
  portalInvitations,
  formError,
  onRefreshPortal,
  onApproveRequest,
  onRejectRequest,
  onPortalInviteEmailChange,
  onPortalContactSearchChange,
  onSelectPortalContact,
  onClearPortalContact,
  onCreateInvitation,
}: PortalPanelProps) {
  return (
    <>
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text-heading">Client Portal Access</h2>
          <p className="text-sm text-app-text-muted mt-1">
            Approve client signup requests and issue portal invitations.
          </p>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-medium text-app-text">Manual distribution</div>
              <div className="text-sm text-app-text-muted">
                No SMTP configured. Copy invite links and share them securely.
              </div>
            </div>
            <button
              type="button"
              onClick={onRefreshPortal}
              className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
            >
              Refresh
            </button>
          </div>
          {portalInviteUrl && (
            <div className="rounded-lg border border-app-accent bg-app-accent-soft p-4">
              <div className="text-sm font-medium text-app-accent-text">Latest invite link</div>
              <div className="mt-1 text-sm text-app-accent-text break-all">{portalInviteUrl}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h3 className="text-lg font-semibold text-app-text-heading">Signup Requests</h3>
          <p className="text-sm text-app-text-muted mt-1">
            Requests from clients waiting for approval.
          </p>
        </div>
        <div className="p-6">
          {portalLoading ? (
            <p className="text-sm text-app-text-muted">Loading requests...</p>
          ) : portalRequests.length === 0 ? (
            <p className="text-sm text-app-text-muted">No pending requests.</p>
          ) : (
            <div className="space-y-4">
              {portalRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-app-border rounded-lg p-4"
                >
                  <div>
                    <div className="text-sm font-medium text-app-text">
                      {request.first_name || request.last_name
                        ? `${request.first_name || ''} ${request.last_name || ''}`.trim()
                        : request.email}
                    </div>
                    <div className="text-sm text-app-text-muted">{request.email}</div>
                    <div className="text-xs text-app-text-subtle mt-1">
                      Requested {new Date(request.requested_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApproveRequest(request.id)}
                      className="px-3 py-1.5 text-sm bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectRequest(request.id)}
                      className="px-3 py-1.5 text-sm bg-app-surface-muted rounded-lg hover:bg-app-hover"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h3 className="text-lg font-semibold text-app-text-heading">Invite a Client</h3>
          <p className="text-sm text-app-text-muted mt-1">
            Create a portal invitation for a client.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="portal-invite-email" className="block text-sm font-medium text-app-text-label mb-1">Client Email</label>
              <input
                id="portal-invite-email"
                type="email"
                value={portalInviteEmail}
                onChange={(event) => onPortalInviteEmailChange(event.target.value)}
                placeholder="client@example.org"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="portal-contact-search" className="block text-sm font-medium text-app-text-label mb-1">Link Existing Contact (optional)</label>
              <input
                id="portal-contact-search"
                type="text"
                value={portalContactSearch}
                onChange={(event) => onPortalContactSearchChange(event.target.value)}
                placeholder="Search contacts by name or email"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg"
              />
              {portalContactLoading && (
                <div className="text-xs text-app-text-muted mt-2">Searching contacts...</div>
              )}
              {portalContactResults.length > 0 && (
                <div className="mt-2 border border-app-border rounded-lg divide-y">
                  {portalContactResults.map((contact) => (
                    <button
                      key={contact.contact_id}
                      type="button"
                      onClick={() => onSelectPortalContact(contact)}
                      className="w-full text-left px-3 py-2 hover:bg-app-surface-muted text-sm"
                    >
                      <div className="font-medium text-app-text">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="text-xs text-app-text-muted">{contact.email || 'No email on file'}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedPortalContact && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-app-accent bg-app-accent-soft px-3 py-2">
                  <div className="text-xs text-app-accent-text">
                    Linked: {selectedPortalContact.first_name} {selectedPortalContact.last_name}
                  </div>
                  <button
                    type="button"
                    onClick={onClearPortalContact}
                    className="text-xs text-app-accent-text hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCreateInvitation}
              className="px-4 py-2 bg-app-accent text-white text-sm font-medium rounded-lg hover:bg-app-accent-hover"
            >
              Create Invitation
            </button>
          </div>
          <ErrorBanner message={formError} className="mt-2" />

          <div className="pt-4 border-t border-app-border">
            <h4 className="text-sm font-semibold text-app-text-heading">Recent Invitations</h4>
            {portalLoading ? (
              <p className="text-sm text-app-text-muted mt-2">Loading invitations...</p>
            ) : portalInvitations.length === 0 ? (
              <p className="text-sm text-app-text-muted mt-2">No portal invitations yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {portalInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between border border-app-border rounded-lg p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-app-text">{invite.email}</div>
                      <div className="text-xs text-app-text-muted">
                        Created {new Date(invite.created_at).toLocaleDateString('en-CA')} • Expires{' '}
                        {new Date(invite.expires_at).toLocaleDateString('en-CA')}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-app-text-muted">
                      {invite.accepted_at ? 'Accepted' : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
