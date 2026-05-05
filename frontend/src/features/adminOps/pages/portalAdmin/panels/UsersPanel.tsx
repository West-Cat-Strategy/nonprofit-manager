import {
  AdminActionGroup,
  AdminStatusPill,
  AdminWorkspaceSection,
  adminControlClassName,
  adminPrimaryButtonClassName,
  adminSubtleButtonClassName,
} from '../../../components/AdminWorkspacePrimitives';
import LoadFailureNotice from './LoadFailureNotice';
import type { PortalPanelProps } from '../panelTypes';

export default function UsersPanel({
  portalUsers,
  portalUsersLoading,
  portalUsersError,
  portalUserSearch,
  selectedPortalUser,
  portalUserActivity,
  portalActivityLoading,
  portalActivityError,
  onPortalUserSearchChange,
  onRefreshUsers,
  onViewUserActivity,
  onToggleUserStatus,
  onOpenResetModal,
}: PortalPanelProps) {
  return (
    <>
      <AdminWorkspaceSection
        title="Portal Users"
        description="Manage portal user access, passwords, and status."
      >
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            aria-label="Search portal users"
            value={portalUserSearch}
            onChange={(event) => onPortalUserSearchChange(event.target.value)}
            placeholder="Search portal users by name or email"
            className={`${adminControlClassName} md:max-w-md`}
          />
          <button type="button" onClick={onRefreshUsers} className={adminSubtleButtonClassName}>
            Refresh
          </button>
        </div>

        {portalUsersError ? (
          <LoadFailureNotice
            title={portalUsers.length ? 'Partial load' : 'Load failed'}
            message={portalUsersError}
          />
        ) : null}
        {portalUsersLoading ? (
          <p className="text-sm text-app-text-muted">Loading portal users...</p>
        ) : portalUsers.length === 0 && !portalUsersError ? (
          <p className="text-sm text-app-text-muted">No portal users found.</p>
        ) : portalUsers.length > 0 ? (
          <div className="space-y-3">
            {portalUsers.map((user) => {
              const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
              return (
                <div key={user.id} className="min-w-0 rounded-lg border border-app-border p-4">
                  <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words text-sm font-medium text-app-text">
                          {name || user.email}
                        </span>
                        <AdminStatusPill tone={user.status === 'active' ? 'success' : 'warning'}>
                          {user.status}
                        </AdminStatusPill>
                        <AdminStatusPill tone={user.is_verified ? 'success' : 'neutral'}>
                          {user.is_verified ? 'Verified' : 'Pending'}
                        </AdminStatusPill>
                      </div>
                      <div className="break-all text-xs text-app-text-muted">{user.email}</div>
                      <div className="mt-1 break-words text-xs text-app-text-subtle">
                        Last login:{' '}
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleString()
                          : 'Never'}
                      </div>
                    </div>
                    <AdminActionGroup>
                      <button
                        type="button"
                        onClick={() => onViewUserActivity(user)}
                        className={adminSubtleButtonClassName}
                      >
                        View Activity
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onToggleUserStatus(
                            user,
                            user.status === 'active' ? 'suspended' : 'active'
                          )
                        }
                        className={adminSubtleButtonClassName}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenResetModal(user)}
                        className={adminPrimaryButtonClassName}
                      >
                        Reset Password
                      </button>
                    </AdminActionGroup>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </AdminWorkspaceSection>

      {selectedPortalUser && (
        <AdminWorkspaceSection
          title="Recent Portal Activity"
          description={`Activity for ${selectedPortalUser.email}`}
        >
          {portalActivityError ? (
            <LoadFailureNotice
              title={portalUserActivity.length ? 'Partial load' : 'Load failed'}
              message={portalActivityError}
            />
          ) : null}
          {portalActivityLoading ? (
            <p className="text-sm text-app-text-muted">Loading activity...</p>
          ) : portalUserActivity.length === 0 && !portalActivityError ? (
            <p className="text-sm text-app-text-muted">No recent activity.</p>
          ) : portalUserActivity.length > 0 ? (
            <div className="space-y-3">
              {portalUserActivity.map((activity) => (
                <div key={activity.id} className="min-w-0 rounded-lg border border-app-border p-3">
                  <div className="break-words text-xs uppercase text-app-text-muted">
                    {activity.action}
                  </div>
                  {activity.details && (
                    <div className="mt-1 break-words text-sm text-app-text">{activity.details}</div>
                  )}
                  <div className="mt-1 break-words text-xs text-app-text-subtle">
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </AdminWorkspaceSection>
      )}
    </>
  );
}
