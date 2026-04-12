import Avatar from '../../../../../components/Avatar';
import type { AuditLogPage, UserSecurityInfo } from '../types';

type UserSecurityModalProps = {
  open: boolean;
  selectedUser: UserSecurityInfo | null;
  roleLabel?: string;
  auditLogPage: AuditLogPage | null;
  onClose: () => void;
  onOpenResetPassword: () => void;
  onOpenResetEmail: () => void;
  onToggleUserLock: () => void;
};

export default function UserSecurityModal({
  open,
  selectedUser,
  roleLabel,
  auditLogPage,
  onClose,
  onOpenResetPassword,
  onOpenResetEmail,
  onToggleUserLock,
}: UserSecurityModalProps) {
  if (!open || !selectedUser) {
    return null;
  }

  const logs = auditLogPage?.logs ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 app-popup-backdrop" onClick={onClose} />
        <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-app-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-app-border px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-app-text">User Security Details</h3>
              <p className="text-sm text-[var(--app-text-muted)]">
                Account status, recent activity, and administrative actions.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-app-text-subtle hover:text-app-text-muted"
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6 p-6">
            <div className="flex items-center space-x-4">
              <Avatar
                src={selectedUser.profilePicture}
                firstName={selectedUser.firstName}
                lastName={selectedUser.lastName}
                size="lg"
              />
              <div>
                <h4 className="text-xl font-semibold text-app-text">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h4>
                <p className="text-app-text-muted">{selectedUser.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs font-medium text-app-text">
                    {roleLabel || selectedUser.role}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      selectedUser.isActive
                        ? 'bg-app-accent-soft text-app-accent-text'
                        : 'bg-app-surface-muted text-app-text'
                    }`}
                  >
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {selectedUser.isLocked && (
                    <span className="rounded-full bg-app-accent-soft px-2 py-0.5 text-xs font-medium text-app-accent-text">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg bg-app-surface-muted p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-app-text-muted">Last Login</p>
                <p className="text-sm font-medium text-app-text">
                  {selectedUser.lastLoginAt
                    ? new Date(selectedUser.lastLoginAt).toLocaleString('en-CA')
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-app-text-muted">
                  Last Password Change
                </p>
                <p className="text-sm font-medium text-app-text">
                  {selectedUser.lastPasswordChange
                    ? new Date(selectedUser.lastPasswordChange).toLocaleString('en-CA')
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-app-text-muted">
                  Failed Login Attempts
                </p>
                <p className="text-sm font-medium text-app-text">
                  {selectedUser.failedLoginAttempts}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-app-text-muted">
                  Account Created
                </p>
                <p className="text-sm font-medium text-app-text">
                  {new Date(selectedUser.createdAt).toLocaleString('en-CA')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenResetPassword}
                className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={onOpenResetEmail}
                className="rounded-lg bg-app-surface-muted px-4 py-2 text-sm font-medium text-app-text-muted hover:bg-app-surface-muted"
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={onToggleUserLock}
                className="rounded-lg bg-app-surface-muted px-4 py-2 text-sm font-medium text-app-text hover:bg-app-surface-muted"
              >
                {selectedUser.isLocked ? 'Unlock Account' : 'Lock Account'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-app-text">Recent Activity</h4>
                <span className="text-xs uppercase tracking-wide text-app-text-muted">
                  {auditLogPage?.total ?? logs.length} events
                </span>
              </div>
              {auditLogPage?.warning && (
                <div className="rounded border border-app-border bg-app-accent-soft px-3 py-2 text-xs text-app-accent-text">
                  {auditLogPage.warning}
                </div>
              )}
              {logs.length > 0 ? (
                <div className="max-h-72 divide-y divide-app-border overflow-y-auto rounded-lg border border-app-border">
                  {logs.map((log) => (
                    <div key={log.id} className="space-y-2 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-app-text">{log.summary}</div>
                        <div className="text-xs text-app-text-muted">
                          {new Date(log.changedAt).toLocaleString('en-CA')}
                        </div>
                      </div>
                      <div className="text-sm text-app-text-muted">{log.details}</div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-app-text-subtle">
                        <span>{log.changedByEmail || 'System'}</span>
                        {log.clientIpAddress && <span>{log.clientIpAddress}</span>}
                        {log.userAgent && <span className="truncate">{log.userAgent}</span>}
                      </div>
                      {log.changedFields && log.changedFields.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {log.changedFields.map((field) => (
                            <span
                              key={field}
                              className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-app-text-muted">No recent activity logs</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
