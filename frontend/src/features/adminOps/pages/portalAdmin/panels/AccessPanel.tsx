import ErrorBanner from '../../../../../components/ErrorBanner';
import {
  AdminActionGroup,
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

type ApprovePortalRequest = (id: string, payload?: { contact_id: string }) => void;

export default function AccessPanel({
  portalInviteUrl,
  portalLoading,
  portalRequestsError,
  portalRequests,
  portalInviteEmail,
  portalContactSearch,
  portalContactLoading,
  portalContactResults,
  selectedPortalContact,
  portalInvitations,
  portalInvitationsError,
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
  const approvePortalRequest = onApproveRequest as ApprovePortalRequest;
  const pendingRequestCount = portalRequests.length;
  const contactResolutionCount = portalRequests.filter(
    (request) => request.resolution_status === 'needs_contact_resolution'
  ).length;
  const pendingInvitationCount = portalInvitations.filter((invite) => !invite.accepted_at).length;

  return (
    <>
      <AdminWorkspaceSection
        title="Client Portal Access"
        description="Approve client signup requests and issue portal invitations."
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium text-app-text">Manual distribution</div>
            <div className="break-words text-sm text-app-text-muted">
              No SMTP configured. Copy invite links and share them securely.
            </div>
          </div>
          <button type="button" onClick={onRefreshPortal} className={adminSubtleButtonClassName}>
            Refresh
          </button>
        </div>
        {portalInviteUrl && (
          <div className="rounded-lg border border-app-accent bg-app-accent-soft p-4">
            <div className="text-sm font-medium text-app-accent-text">Latest invite link</div>
            <div className="mt-1 text-sm text-app-accent-text break-all">{portalInviteUrl}</div>
          </div>
        )}
      </AdminWorkspaceSection>

      <AdminWorkspaceSection
        title="Signup Requests"
        description="Requests from clients waiting for approval."
      >
        {!portalLoading && (
          <AdminMetricGrid className="mb-4 md:grid-cols-3 xl:grid-cols-3">
            <AdminMetricTile label="Pending requests" value={pendingRequestCount} />
            <AdminMetricTile
              label="Contact matches"
              value={contactResolutionCount}
              tone={contactResolutionCount ? 'warning' : 'neutral'}
            />
            <AdminMetricTile label="Pending invites" value={pendingInvitationCount} />
          </AdminMetricGrid>
        )}
        {portalRequestsError ? (
          <LoadFailureNotice
            title={portalRequests.length ? 'Partial load' : 'Load failed'}
            message={portalRequestsError}
          />
        ) : null}
        {portalLoading ? (
          <p className="text-sm text-app-text-muted">Loading requests...</p>
        ) : portalRequests.length === 0 && !portalRequestsError ? (
          <p className="text-sm text-app-text-muted">No pending requests.</p>
        ) : portalRequests.length > 0 ? (
          <div className="space-y-4">
            {portalRequests.map((request) => {
              const needsContactResolution =
                request.resolution_status === 'needs_contact_resolution';
              const selectedContactId = selectedPortalContact?.contact_id;
              const canApproveRequest = !needsContactResolution || Boolean(selectedContactId);

              return (
                <div
                  key={request.id}
                  className="flex min-w-0 flex-col gap-3 rounded-lg border border-app-border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="break-words text-sm font-medium text-app-text">
                      {request.first_name || request.last_name
                        ? `${request.first_name || ''} ${request.last_name || ''}`.trim()
                        : request.email}
                    </div>
                    <div className="break-all text-sm text-app-text-muted">{request.email}</div>
                    <div className="text-xs text-app-text-subtle mt-1">
                      Requested {new Date(request.requested_at).toLocaleString()}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {needsContactResolution ? (
                        <AdminStatusPill tone="warning">Contact match needed</AdminStatusPill>
                      ) : (
                        <AdminStatusPill tone="neutral">Ready for approval</AdminStatusPill>
                      )}
                      <AdminStatusPill tone="neutral">
                        {request.contact_id ? 'Linked contact' : 'No linked contact'}
                      </AdminStatusPill>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col items-stretch gap-2 md:items-end">
                    <div className="text-xs text-app-text-muted">
                      {needsContactResolution
                        ? selectedContactId
                          ? `Approve using selected contact ${selectedPortalContact?.first_name} ${selectedPortalContact?.last_name}`.trim()
                          : 'Select a matching contact before approval'
                        : 'Approve or reject'}
                    </div>
                    <AdminActionGroup>
                      <button
                        type="button"
                        onClick={() => {
                          if (needsContactResolution) {
                            if (!selectedContactId) {
                              return;
                            }
                            approvePortalRequest(request.id, { contact_id: selectedContactId });
                            return;
                          }
                          approvePortalRequest(request.id);
                        }}
                        disabled={!canApproveRequest}
                        className={adminPrimaryButtonClassName}
                      >
                        {needsContactResolution
                          ? selectedContactId
                            ? 'Approve with contact'
                            : 'Select contact first'
                          : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectRequest(request.id)}
                        className={adminSubtleButtonClassName}
                      >
                        Reject
                      </button>
                    </AdminActionGroup>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </AdminWorkspaceSection>

      <AdminWorkspaceSection
        title="Invite a Client"
        description="Create a portal invitation for a client."
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="portal-invite-email"
              className="block text-sm font-medium text-app-text-label mb-1"
            >
              Client Email
            </label>
            <input
              id="portal-invite-email"
              type="email"
              value={portalInviteEmail}
              onChange={(event) => onPortalInviteEmailChange(event.target.value)}
              placeholder="client@example.org"
              className={adminControlClassName}
            />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="portal-contact-search"
              className="block text-sm font-medium text-app-text-label mb-1"
            >
              Link Existing Contact (optional)
            </label>
            <input
              id="portal-contact-search"
              type="text"
              value={portalContactSearch}
              onChange={(event) => onPortalContactSearchChange(event.target.value)}
              placeholder="Search contacts by name or email"
              className={adminControlClassName}
            />
            {portalContactLoading && (
              <div className="text-xs text-app-text-muted mt-2">Searching contacts...</div>
            )}
            {portalContactResults.length > 0 && (
              <div className="mt-2 min-w-0 divide-y rounded-lg border border-app-border">
                {portalContactResults.map((contact) => (
                  <button
                    key={contact.contact_id}
                    type="button"
                    onClick={() => onSelectPortalContact(contact)}
                    className="w-full min-w-0 px-3 py-2 text-left text-sm hover:bg-app-surface-muted"
                  >
                    <div className="break-words font-medium text-app-text">
                      {contact.first_name} {contact.last_name}
                    </div>
                    <div className="break-all text-xs text-app-text-muted">
                      {contact.email || 'No email on file'}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedPortalContact && (
              <div className="mt-2 flex min-w-0 flex-col gap-2 rounded-lg border border-app-accent bg-app-accent-soft px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="break-words text-xs text-app-accent-text">
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
        <div className="flex items-stretch gap-3 sm:items-center">
          <button
            type="button"
            onClick={onCreateInvitation}
            className={adminPrimaryButtonClassName}
          >
            Create Invitation
          </button>
        </div>
        <ErrorBanner message={formError} className="mt-2" />

        <div className="pt-4 border-t border-app-border">
          <h4 className="text-sm font-semibold text-app-text-heading">Recent Invitations</h4>
          {portalInvitationsError ? (
            <LoadFailureNotice
              title={portalInvitations.length ? 'Partial load' : 'Load failed'}
              message={portalInvitationsError}
            />
          ) : null}
          {portalLoading ? (
            <p className="text-sm text-app-text-muted mt-2">Loading invitations...</p>
          ) : portalInvitations.length === 0 && !portalInvitationsError ? (
            <p className="text-sm text-app-text-muted mt-2">No portal invitations yet.</p>
          ) : portalInvitations.length > 0 ? (
            <div className="mt-3 space-y-2">
              {portalInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex min-w-0 flex-col gap-2 rounded-lg border border-app-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="break-all text-sm font-medium text-app-text">{invite.email}</div>
                    <div className="break-words text-xs text-app-text-muted">
                      Created {new Date(invite.created_at).toLocaleDateString('en-CA')} • Expires{' '}
                      {new Date(invite.expires_at).toLocaleDateString('en-CA')}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-app-text-muted sm:text-right">
                    {invite.accepted_at ? 'Accepted' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </AdminWorkspaceSection>
    </>
  );
}
