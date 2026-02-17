import { Link } from 'react-router-dom';
import Avatar from '../../../../components/Avatar';
import type { UserInvitation, UserSearchResult } from '../types';

interface UsersSectionProps {
  userSearchQuery: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  userSearchResults: UserSearchResult[];
  onSelectUser: (userId: string) => void;
  onShowInvite: () => void;
  onGoToRoles: () => void;
  invitations: UserInvitation[];
  onResendInvitation: (invitationId: string) => void;
  onRevokeInvitation: (invitationId: string) => void;
}

export default function UsersSection({
  userSearchQuery,
  onSearchChange,
  isSearching,
  userSearchResults,
  onSelectUser,
  onShowInvite,
  onGoToRoles,
  invitations,
  onResendInvitation,
  onRevokeInvitation,
}: UsersSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text-heading">User Lookup</h2>
          <p className="text-sm text-app-text-muted mt-1">Search for users to manage their security settings</p>
        </div>

        <div className="p-6">
          <div className="relative">
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-4 py-3 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent pl-10"
            />
            <svg
              className="absolute left-3 top-3.5 w-5 h-5 text-app-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-3.5">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-app-accent"></div>
              </div>
            )}
          </div>

          {userSearchResults.length > 0 && (
            <div className="mt-4 border border-app-border rounded-lg divide-y divide-app-border">
              {userSearchResults.map((user) => (
                <button
                  type="button"
                  key={user.id}
                  className="w-full p-4 hover:bg-app-surface-muted cursor-pointer flex items-center justify-between text-left"
                  onClick={() => onSelectUser(user.id)}
                >
                  <div className="flex items-center">
                    <Avatar
                      src={user.profilePicture}
                      firstName={user.firstName}
                      lastName={user.lastName}
                      size="md"
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-app-text">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-app-text-muted">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-app-surface-muted text-app-text'
                      }`}
                    >
                      {user.role}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <svg className="w-5 h-5 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {userSearchQuery && !isSearching && userSearchResults.length === 0 && (
            <div className="mt-4 text-center py-8 text-app-text-muted">
              No users found matching &quot;{userSearchQuery}&quot;
            </div>
          )}
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted flex items-center justify-between">
          <h2 className="text-lg font-semibold text-app-text-heading">User Management</h2>
          <button
            type="button"
            onClick={onShowInvite}
            className="px-4 py-2 bg-app-accent text-white text-sm font-medium rounded-lg hover:bg-app-accent-hover"
          >
            Invite User
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/users"
              className="flex items-center p-4 border border-app-border rounded-lg hover:bg-app-surface-muted transition-colors"
            >
              <div className="w-10 h-10 bg-app-accent-soft rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-app-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-app-text">All Users</div>
                <div className="text-sm text-app-text-muted">View and manage all users</div>
              </div>
            </Link>

            <button
              type="button"
              onClick={onGoToRoles}
              className="flex items-center p-4 border border-app-border rounded-lg hover:bg-app-surface-muted transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-app-text">Roles &amp; Permissions</div>
                <div className="text-sm text-app-text-muted">Manage access levels</div>
              </div>
            </button>

            <Link
              to="/admin/audit-logs"
              className="flex items-center p-4 border border-app-border rounded-lg hover:bg-app-surface-muted transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-app-text">Audit Logs</div>
                <div className="text-sm text-app-text-muted">View system activity</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text-heading">Security Settings</h2>
          <p className="text-sm text-app-text-muted mt-1">Organization-wide security policies</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-app-border-muted">
            <div>
              <div className="text-sm font-medium text-app-text">Require Strong Passwords</div>
              <div className="text-sm text-app-text-muted">Minimum 8 characters with uppercase, lowercase, number, and symbol</div>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Enabled</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-app-border-muted">
            <div>
              <div className="text-sm font-medium text-app-text">Account Lockout</div>
              <div className="text-sm text-app-text-muted">Lock accounts after 5 failed login attempts</div>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Enabled</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-app-border-muted">
            <div>
              <div className="text-sm font-medium text-app-text">Session Timeout</div>
              <div className="text-sm text-app-text-muted">Automatically log out after 24 hours of inactivity</div>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-app-accent-soft text-app-accent-text rounded-full">24 hours</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-app-text">Two-Factor Authentication</div>
              <div className="text-sm text-app-text-muted">Require 2FA for admin accounts</div>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-app-surface-muted text-app-text rounded-full">Coming Soon</span>
          </div>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
          <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
            <h2 className="text-lg font-semibold text-app-text-heading">Pending Invitations</h2>
            <p className="text-sm text-app-text-muted mt-1">Users who have been invited but haven&apos;t created their account yet</p>
          </div>
          <div className="divide-y divide-app-border">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-app-text">{invitation.email}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        invitation.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-app-surface-muted text-app-text'
                      }`}
                    >
                      {invitation.role}
                    </span>
                  </div>
                  <div className="text-sm text-app-text-muted mt-1">
                    Invited {new Date(invitation.createdAt).toLocaleDateString('en-CA')}
                    {invitation.createdByName && ` by ${invitation.createdByName}`}
                    {' '}•{' '}
                    Expires {new Date(invitation.expiresAt).toLocaleDateString('en-CA')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onResendInvitation(invitation.id)}
                    className="px-3 py-1.5 text-sm text-app-accent hover:text-app-accent-hover font-medium"
                  >
                    Resend
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevokeInvitation(invitation.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
