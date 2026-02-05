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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">User Lookup</h2>
          <p className="text-sm text-gray-500 mt-1">Search for users to manage their security settings</p>
        </div>

        <div className="p-6">
          <div className="relative">
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
            />
            <svg
              className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-3.5">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {userSearchResults.length > 0 && (
            <div className="mt-4 border border-gray-200 rounded-lg divide-y divide-gray-200">
              {userSearchResults.map((user) => (
                <button
                  type="button"
                  key={user.id}
                  className="w-full p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-left"
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
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
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
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {userSearchQuery && !isSearching && userSearchResults.length === 0 && (
            <div className="mt-4 text-center py-8 text-gray-500">
              No users found matching &quot;{userSearchQuery}&quot;
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
          <button
            type="button"
            onClick={onShowInvite}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Invite User
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/users"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">All Users</div>
                <div className="text-sm text-gray-500">View and manage all users</div>
              </div>
            </Link>

            <button
              type="button"
              onClick={onGoToRoles}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Roles &amp; Permissions</div>
                <div className="text-sm text-gray-500">Manage access levels</div>
              </div>
            </button>

            <Link
              to="/admin/audit-logs"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Audit Logs</div>
                <div className="text-sm text-gray-500">View system activity</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Organization-wide security policies</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-900">Require Strong Passwords</div>
              <div className="text-sm text-gray-500">Minimum 8 characters with uppercase, lowercase, number, and symbol</div>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Enabled</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-900">Account Lockout</div>
              <div className="text-sm text-gray-500">Lock accounts after 5 failed login attempts</div>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Enabled</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-900">Session Timeout</div>
              <div className="text-sm text-gray-500">Automatically log out after 24 hours of inactivity</div>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">24 hours</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-gray-900">Two-Factor Authentication</div>
              <div className="text-sm text-gray-500">Require 2FA for admin accounts</div>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Coming Soon</span>
          </div>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Pending Invitations</h2>
            <p className="text-sm text-gray-500 mt-1">Users who have been invited but haven&apos;t created their account yet</p>
          </div>
          <div className="divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{invitation.email}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        invitation.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {invitation.role}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
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
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
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
