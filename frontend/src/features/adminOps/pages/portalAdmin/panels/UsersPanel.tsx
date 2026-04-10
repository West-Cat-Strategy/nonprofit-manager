import type { PortalPanelProps } from '../panelTypes';

export default function UsersPanel({
  portalUsers,
  portalUsersLoading,
  portalUserSearch,
  selectedPortalUser,
  portalUserActivity,
  portalActivityLoading,
  onPortalUserSearchChange,
  onRefreshUsers,
  onViewUserActivity,
  onToggleUserStatus,
  onOpenResetModal,
}: PortalPanelProps) {
  return (
    <>
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h3 className="text-lg font-semibold text-app-text-heading">Portal Users</h3>
          <p className="text-sm text-app-text-muted mt-1">
            Manage portal user access, passwords, and status.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <input
              type="text"
              aria-label="Search portal users"
              value={portalUserSearch}
              onChange={(event) => onPortalUserSearchChange(event.target.value)}
              placeholder="Search portal users by name or email"
              className="w-full md:max-w-md px-3 py-2 border border-app-input-border rounded-lg"
            />
            <button
              type="button"
              onClick={onRefreshUsers}
              className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
            >
              Refresh
            </button>
          </div>

          {portalUsersLoading ? (
            <p className="text-sm text-app-text-muted">Loading portal users...</p>
          ) : portalUsers.length === 0 ? (
            <p className="text-sm text-app-text-muted">No portal users found.</p>
          ) : (
            <div className="space-y-3">
              {portalUsers.map((user) => {
                const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                return (
                  <div key={user.id} className="border border-app-border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-app-text">
                            {name || user.email}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              user.status === 'active'
                                ? 'bg-app-accent-soft text-app-accent-text'
                                : 'bg-app-accent-soft text-app-accent-text'
                            }`}
                          >
                            {user.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              user.is_verified
                                ? 'bg-app-accent-soft text-app-accent-text'
                                : 'bg-app-accent-soft text-app-accent-text'
                            }`}
                          >
                            {user.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-xs text-app-text-muted">{user.email}</div>
                        <div className="text-xs text-app-text-subtle mt-1">
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
                          className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
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
                              ? 'bg-app-accent-soft text-app-accent-text hover:bg-app-accent-soft'
                              : 'bg-app-accent-soft text-app-accent-text hover:bg-app-accent-soft'
                          }`}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenResetModal(user)}
                          className="px-3 py-1.5 text-xs bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
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
        <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
          <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
            <h3 className="text-lg font-semibold text-app-text-heading">Recent Portal Activity</h3>
            <p className="text-sm text-app-text-muted mt-1">
              Activity for {selectedPortalUser.email}
            </p>
          </div>
          <div className="p-6">
            {portalActivityLoading ? (
              <p className="text-sm text-app-text-muted">Loading activity...</p>
            ) : portalUserActivity.length === 0 ? (
              <p className="text-sm text-app-text-muted">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {portalUserActivity.map((activity) => (
                  <div key={activity.id} className="border border-app-border rounded-lg p-3">
                    <div className="text-xs text-app-text-muted uppercase">{activity.action}</div>
                    {activity.details && (
                      <div className="text-sm text-app-text mt-1">{activity.details}</div>
                    )}
                    <div className="text-xs text-app-text-subtle mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
