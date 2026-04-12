import Avatar from '../../../../../components/Avatar';
<<<<<<< HEAD
import type { AuditLogPage, UserSecurityInfo } from '../types';
=======
import type { AuditLog, UserSecurityInfo } from '../types';
>>>>>>> origin/main

type UserSecurityModalProps = {
  open: boolean;
  selectedUser: UserSecurityInfo | null;
<<<<<<< HEAD
  roleLabel?: string;
  auditLogPage: AuditLogPage | null;
=======
  userAuditLogs: AuditLog[];
>>>>>>> origin/main
  onClose: () => void;
  onOpenResetPassword: () => void;
  onOpenResetEmail: () => void;
  onToggleUserLock: () => void;
};

export default function UserSecurityModal({
  open,
  selectedUser,
<<<<<<< HEAD
  roleLabel,
  auditLogPage,
=======
  userAuditLogs,
>>>>>>> origin/main
  onClose,
  onOpenResetPassword,
  onOpenResetEmail,
  onToggleUserLock,
}: UserSecurityModalProps) {
  if (!open || !selectedUser) {
    return null;
  }

<<<<<<< HEAD
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
=======
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-app-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-app-text">User Security Details</h3>
>>>>>>> origin/main
            <button
              type="button"
              onClick={onClose}
              className="text-app-text-subtle hover:text-app-text-muted"
              aria-label="Close modal"
            >
<<<<<<< HEAD
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
=======
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
>>>>>>> origin/main
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

<<<<<<< HEAD
          <div className="space-y-6 p-6">
=======
          <div className="p-6 space-y-6">
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    selectedUser.role === 'admin' ? 'bg-app-accent-soft text-app-accent-text' : 'bg-app-surface-muted text-app-text'
                  }`}>
                    {selectedUser.role}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    selectedUser.isActive ? 'bg-app-accent-soft text-app-accent-text' : 'bg-app-accent-soft text-app-accent-text'
                  }`}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {selectedUser.isLocked && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-app-accent-soft text-app-accent-text rounded-full">
>>>>>>> origin/main
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>

<<<<<<< HEAD
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
=======
            <div className="grid grid-cols-2 gap-4 p-4 bg-app-surface-muted rounded-lg">
              <div>
                <p className="text-xs text-app-text-muted uppercase tracking-wide">Last Login</p>
                <p className="text-sm font-medium text-app-text">
                  {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString('en-CA') : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs text-app-text-muted uppercase tracking-wide">Last Password Change</p>
>>>>>>> origin/main
                <p className="text-sm font-medium text-app-text">
                  {selectedUser.lastPasswordChange
                    ? new Date(selectedUser.lastPasswordChange).toLocaleString('en-CA')
                    : 'Never'}
                </p>
              </div>
              <div>
<<<<<<< HEAD
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
=======
                <p className="text-xs text-app-text-muted uppercase tracking-wide">Failed Login Attempts</p>
                <p className="text-sm font-medium text-app-text">{selectedUser.failedLoginAttempts}</p>
              </div>
              <div>
                <p className="text-xs text-app-text-muted uppercase tracking-wide">Account Created</p>
                <p className="text-sm font-medium text-app-text">{new Date(selectedUser.createdAt).toLocaleString('en-CA')}</p>
>>>>>>> origin/main
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenResetPassword}
<<<<<<< HEAD
                className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
=======
                className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] text-sm font-medium rounded-lg hover:bg-app-accent-hover"
>>>>>>> origin/main
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={onOpenResetEmail}
<<<<<<< HEAD
                className="rounded-lg bg-app-surface-muted px-4 py-2 text-sm font-medium text-app-text-muted hover:bg-app-surface-muted"
=======
                className="px-4 py-2 bg-app-surface-muted text-app-text-muted text-sm font-medium rounded-lg hover:bg-app-surface-muted"
>>>>>>> origin/main
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={onToggleUserLock}
<<<<<<< HEAD
                className="rounded-lg bg-app-surface-muted px-4 py-2 text-sm font-medium text-app-text hover:bg-app-surface-muted"
=======
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  selectedUser.isLocked
                    ? 'bg-app-accent-soft text-app-accent-text hover:bg-app-accent-soft'
                    : 'bg-app-accent-soft text-app-accent-text hover:bg-app-accent-soft'
                }`}
>>>>>>> origin/main
              >
                {selectedUser.isLocked ? 'Unlock Account' : 'Lock Account'}
              </button>
            </div>

<<<<<<< HEAD
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
=======
            <div>
              <h4 className="text-sm font-semibold text-app-text mb-3">Recent Activity</h4>
              {userAuditLogs.length > 0 ? (
                <div className="border border-app-border rounded-lg divide-y divide-app-border max-h-64 overflow-y-auto">
                  {userAuditLogs.map((log) => (
                    <div key={log.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-app-text">{log.action}</span>
                        <span className="text-xs text-app-text-muted">
                          {new Date(log.createdAt).toLocaleString('en-CA')}
                        </span>
                      </div>
                      {log.details && <p className="text-app-text-muted mt-1">{log.details}</p>}
                      <p className="text-xs text-app-text-subtle mt-1">IP: {log.ipAddress}</p>
>>>>>>> origin/main
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
