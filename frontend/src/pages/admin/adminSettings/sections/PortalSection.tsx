import ErrorBanner from '../../../../components/ErrorBanner';
import type {
  PortalActivity,
  PortalContactLookup,
  PortalInvitation,
  PortalSignupRequest,
  PortalUser,
} from '../types';

interface PortalSectionProps {
  portalInviteUrl: string | null;
  portalLoading: boolean;
  portalRequests: PortalSignupRequest[];
  portalInviteEmail: string;
  portalContactSearch: string;
  portalContactLoading: boolean;
  portalContactResults: PortalContactLookup[];
  selectedPortalContact: PortalContactLookup | null;
  portalInvitations: PortalInvitation[];
  portalUsers: PortalUser[];
  portalUsersLoading: boolean;
  portalUserSearch: string;
  selectedPortalUser: PortalUser | null;
  portalUserActivity: PortalActivity[];
  portalActivityLoading: boolean;
  formError?: string | null;
  onRefreshPortal: () => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onPortalInviteEmailChange: (value: string) => void;
  onPortalContactSearchChange: (value: string) => void;
  onSelectPortalContact: (contact: PortalContactLookup) => void;
  onClearPortalContact: () => void;
  onCreateInvitation: () => void;
  onPortalUserSearchChange: (value: string) => void;
  onRefreshUsers: () => void;
  onViewUserActivity: (user: PortalUser) => void;
  onToggleUserStatus: (user: PortalUser, status: string) => void;
  onOpenResetModal: (user: PortalUser) => void;
}

export default function PortalSection({
  portalInviteUrl,
  portalLoading,
  portalRequests,
  portalInviteEmail,
  portalContactSearch,
  portalContactLoading,
  portalContactResults,
  selectedPortalContact,
  portalInvitations,
  portalUsers,
  portalUsersLoading,
  portalUserSearch,
  selectedPortalUser,
  portalUserActivity,
  portalActivityLoading,
  formError,
  onRefreshPortal,
  onApproveRequest,
  onRejectRequest,
  onPortalInviteEmailChange,
  onPortalContactSearchChange,
  onSelectPortalContact,
  onClearPortalContact,
  onCreateInvitation,
  onPortalUserSearchChange,
  onRefreshUsers,
  onViewUserActivity,
  onToggleUserStatus,
  onOpenResetModal,
}: PortalSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Client Portal Access</h2>
          <p className="text-sm text-gray-500 mt-1">
            Approve client signup requests and issue portal invitations.
          </p>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-medium text-gray-900">Manual distribution</div>
              <div className="text-sm text-gray-500">
                No SMTP configured. Copy invite links and share them securely.
              </div>
            </div>
            <button
              type="button"
              onClick={onRefreshPortal}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Refresh
            </button>
          </div>
          {portalInviteUrl && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm font-medium text-blue-900">Latest invite link</div>
              <div className="mt-1 text-sm text-blue-800 break-all">{portalInviteUrl}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Signup Requests</h3>
          <p className="text-sm text-gray-500 mt-1">
            Requests from clients waiting for approval.
          </p>
        </div>
        <div className="p-6">
          {portalLoading ? (
            <p className="text-sm text-gray-500">Loading requests...</p>
          ) : portalRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No pending requests.</p>
          ) : (
            <div className="space-y-4">
              {portalRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-200 rounded-lg p-4"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {request.first_name || request.last_name
                        ? `${request.first_name || ''} ${request.last_name || ''}`.trim()
                        : request.email}
                    </div>
                    <div className="text-sm text-gray-500">{request.email}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Requested {new Date(request.requested_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApproveRequest(request.id)}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectRequest(request.id)}
                      className="px-3 py-1.5 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Invite a Client</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create a portal invitation for a client.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
              <input
                type="email"
                value={portalInviteEmail}
                onChange={(e) => onPortalInviteEmailChange(e.target.value)}
                placeholder="client@example.org"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link Existing Contact (optional)</label>
              <input
                type="text"
                value={portalContactSearch}
                onChange={(e) => onPortalContactSearchChange(e.target.value)}
                placeholder="Search contacts by name or email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {portalContactLoading && (
                <div className="text-xs text-gray-500 mt-2">Searching contacts...</div>
              )}
              {portalContactResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg divide-y">
                  {portalContactResults.map((contact) => (
                    <button
                      key={contact.contact_id}
                      type="button"
                      onClick={() => onSelectPortalContact(contact)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <div className="font-medium text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{contact.email || 'No email on file'}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedPortalContact && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <div className="text-xs text-blue-900">
                    Linked: {selectedPortalContact.first_name} {selectedPortalContact.last_name}
                  </div>
                  <button
                    type="button"
                    onClick={onClearPortalContact}
                    className="text-xs text-blue-700 hover:underline"
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
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Create Invitation
            </button>
          </div>
          <ErrorBanner message={formError} className="mt-2" />

          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">Recent Invitations</h4>
            {portalLoading ? (
              <p className="text-sm text-gray-500 mt-2">Loading invitations...</p>
            ) : portalInvitations.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">No portal invitations yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {portalInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between border border-gray-200 rounded-lg p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{invite.email}</div>
                      <div className="text-xs text-gray-500">
                        Created {new Date(invite.created_at).toLocaleDateString('en-CA')} • Expires{' '}
                        {new Date(invite.expires_at).toLocaleDateString('en-CA')}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-gray-500">
                      {invite.accepted_at ? 'Accepted' : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Portal Users</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage portal user access, passwords, and status.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <input
              type="text"
              value={portalUserSearch}
              onChange={(e) => onPortalUserSearchChange(e.target.value)}
              placeholder="Search portal users by name or email"
              className="w-full md:max-w-md px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={onRefreshUsers}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Refresh
            </button>
          </div>

          {portalUsersLoading ? (
            <p className="text-sm text-gray-500">Loading portal users...</p>
          ) : portalUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No portal users found.</p>
          ) : (
            <div className="space-y-3">
              {portalUsers.map((user) => {
                const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                return (
                  <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {name || user.email}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              user.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              user.is_verified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {user.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Last login:{' '}
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleString()
                            : 'Never'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewUserActivity(user)}
                          className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          View Activity
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onToggleUserStatus(user, user.status === 'active' ? 'suspended' : 'active')
                          }
                          className={`px-3 py-1.5 text-xs rounded-lg ${
                            user.status === 'active'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenResetModal(user)}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Reset Password
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedPortalUser && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Recent Portal Activity</h3>
            <p className="text-sm text-gray-500 mt-1">
              Activity for {selectedPortalUser.email}
            </p>
          </div>
          <div className="p-6">
            {portalActivityLoading ? (
              <p className="text-sm text-gray-500">Loading activity...</p>
            ) : portalUserActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {portalUserActivity.map((activity) => (
                  <div key={activity.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase">{activity.action}</div>
                    {activity.details && (
                      <div className="text-sm text-gray-800 mt-1">{activity.details}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
