import { Link } from 'react-router-dom';
import Avatar from '../../../../../components/Avatar';
import { normalizeRoleSlug } from '../../../../auth/state/roleNormalization';
import { getAdminSettingsPath } from '../../../adminRoutePaths';
import PendingApprovalsSummaryCard from '../components/PendingApprovalsSummaryCard';
import type { OrganizationAccount, UserInvitation, UserSearchResult } from '../types';
import { getRoleDisplayLabel } from '../utils';

interface UsersSectionProps {
  userSearchQuery: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  userSearchResults: UserSearchResult[];
  roleLabels: Record<string, string>;
  onSelectUser: (userId: string) => void;
  onOpenAccess: (userId: string) => void;
  onShowInvite: () => void;
  onGoToRoles: () => void;
  onGoToGroups: () => void;
  invitations: UserInvitation[];
  onResendInvitation: (invitation: UserInvitation) => void;
  onRevokeInvitation: (invitationId: string) => void;
  organizationAccounts: OrganizationAccount[];
}

const getCountLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

export default function UsersSection({
  userSearchQuery,
  onSearchChange,
  isSearching,
  userSearchResults,
  roleLabels,
  onSelectUser,
  onOpenAccess,
  onShowInvite,
  onGoToRoles,
  onGoToGroups,
  invitations,
  onResendInvitation,
  onRevokeInvitation,
  organizationAccounts,
}: UsersSectionProps) {
  const getLabel = (role: string) => getRoleDisplayLabel(role, roleLabels);

  return (
    <div className="space-y-6">
      <PendingApprovalsSummaryCard />

      <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
          <h2 className="text-lg font-semibold text-app-text-heading">Account Lookup</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Search for staff accounts, open access details, and jump into security actions.
          </p>
        </div>

        <div className="p-6">
          <div className="relative">
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or email..."
              aria-label="Search users"
              className="w-full rounded-lg border border-app-input-border py-3 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-app-accent"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-app-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-3.5">
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-app-accent" />
              </div>
            )}
          </div>

          {userSearchResults.length > 0 && (
            <div className="mt-4 divide-y divide-app-border overflow-hidden rounded-lg border border-app-border">
              {userSearchResults.map((user) => {
                const normalizedRole = normalizeRoleSlug(user.role);

                return (
                  <div
                    key={user.id}
                    className="flex w-full flex-col gap-4 p-4 text-left hover:bg-app-surface-muted lg:flex-row lg:items-center lg:justify-between"
                  >
                    <button
                      type="button"
                      className="flex items-center text-left"
                      onClick={() => onSelectUser(user.id)}
                    >
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
                    </button>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          normalizedRole === 'admin'
                            ? 'bg-app-accent-soft text-app-accent-text'
                            : 'bg-app-surface-muted text-app-text'
                        }`}
                      >
                        {getLabel(user.role)}
                      </span>
                      <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs font-medium text-app-text">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-medium text-app-accent-text">
                        {getCountLabel(user.groups?.length ?? 0, 'group', 'groups')}
                      </span>
                      <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-medium text-app-accent-text">
                        {getCountLabel(
                          user.organizationAccess?.length ?? 0,
                          'account',
                          'accounts'
                        )}
                      </span>
                      <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs font-medium text-app-text">
                        {user.passkeyCount ? `${user.passkeyCount} passkeys` : 'No passkeys'}
                      </span>
                      {user.mfaTotpEnabled ? (
                        <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs font-medium text-app-text">
                          2FA enabled
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onOpenAccess(user.id)}
                        className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-medium text-app-text hover:bg-app-surface-muted"
                      >
                        Manage Access
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {userSearchQuery && !isSearching && userSearchResults.length === 0 && (
            <div className="mt-4 py-8 text-center text-app-text-muted">
              No users found matching &quot;{userSearchQuery}&quot;
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-app-border bg-app-surface-muted px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-app-text-heading">Account Management</h2>
            <p className="mt-1 text-sm text-app-text-muted">
              Administer users, roles, access groups, and audit trails from one workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onShowInvite}
            className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
          >
            Invite User
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Link
              to={getAdminSettingsPath('users')}
              className="flex items-center rounded-lg border border-app-border p-4 transition-colors hover:bg-app-surface-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent-soft">
                <svg
                  className="h-6 w-6 text-app-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-app-text">Users</div>
                <div className="text-sm text-app-text-muted">Search, invite, and manage accounts</div>
              </div>
            </Link>

            <button
              type="button"
              onClick={onGoToGroups}
              className="flex items-center rounded-lg border border-app-border p-4 text-left transition-colors hover:bg-app-surface-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent-soft">
                <svg
                  className="h-6 w-6 text-app-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-app-text">Groups</div>
                <div className="text-sm text-app-text-muted">Bundle access into policy groups</div>
              </div>
            </button>

            <button
              type="button"
              onClick={onGoToRoles}
              className="flex items-center rounded-lg border border-app-border p-4 text-left transition-colors hover:bg-app-surface-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent-soft">
                <svg
                  className="h-6 w-6 text-app-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-app-text">Roles</div>
                <div className="text-sm text-app-text-muted">Manage access levels</div>
              </div>
            </button>

            <Link
              to={getAdminSettingsPath('audit_logs')}
              className="flex items-center rounded-lg border border-app-border p-4 transition-colors hover:bg-app-surface-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent-soft">
                <svg
                  className="h-6 w-6 text-app-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-app-text">Audit Logs</div>
                <div className="text-sm text-app-text-muted">View system activity</div>
              </div>
            </Link>
          </div>

          {organizationAccounts.length > 0 && (
            <p className="mt-4 text-sm text-app-text-muted">
              {organizationAccounts.length}{' '}
              {organizationAccounts.length === 1 ? 'organization account' : 'organization accounts'}{' '}
              available for access assignment.
            </p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
          <h2 className="text-lg font-semibold text-app-text">Access Policies</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Groups and invitations are managed here, while registration approvals now live in the
            dedicated approvals workspace.
          </p>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-app-border bg-app-surface-muted p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-app-text">Organization Access</div>
                <div className="text-sm text-app-text-muted">
                  Assign users to organization accounts and shared workspaces.
                </div>
              </div>
              <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-medium text-app-accent-text">
                Managed in Access
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-app-border bg-app-surface-muted p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-app-text">Group Policies</div>
                <div className="text-sm text-app-text-muted">
                  Bundle role access into reusable groups, then assign those groups to users.
                </div>
              </div>
              <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-medium text-app-accent-text">
                Managed in Groups
              </span>
            </div>
          </div>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
          <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
            <h2 className="text-lg font-semibold text-app-text-heading">Pending Invitations</h2>
            <p className="mt-1 text-sm text-app-text-muted">
              Users who have been invited but haven&apos;t created their account yet.
            </p>
          </div>
          <div className="divide-y divide-app-border">
            {invitations.map((invitation) => {
              const normalizedRole = normalizeRoleSlug(invitation.role);

              return (
                <div key={invitation.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-app-text">{invitation.email}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          normalizedRole === 'admin'
                            ? 'bg-app-accent-soft text-app-accent-text'
                            : 'bg-app-surface-muted text-app-text'
                        }`}
                      >
                        {getLabel(invitation.role)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-app-text-muted">
                      Invited {new Date(invitation.createdAt).toLocaleDateString('en-CA')}
                      {invitation.createdByName && ` by ${invitation.createdByName}`}
                      {' '}•{' '}
                      Expires {new Date(invitation.expiresAt).toLocaleDateString('en-CA')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onResendInvitation(invitation)}
                      className="px-3 py-1.5 text-sm font-medium text-app-accent hover:text-app-accent-hover"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => onRevokeInvitation(invitation.id)}
                      className="px-3 py-1.5 text-sm font-medium text-app-accent hover:text-app-accent-text"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
