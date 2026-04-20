import ErrorBanner from '../../../components/ErrorBanner';
import type { RoleSelectorItem } from '../../adminOps/contracts';
import type { InvitationEmailDelivery } from '../types';
import { getInvitationRoleDisplayLabel } from '../utils';

interface InviteUserModalProps {
  open: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  roleOptions: RoleSelectorItem[];
  inviteUrl: string | null;
  inviteEmailDelivery: InvitationEmailDelivery | null;
  inviteEmailConfigured: boolean;
  inviteCapabilitiesLoading: boolean;
  isCreatingInvite: boolean;
  error: string | null;
  onCreateInvitation: (sendEmail: boolean) => void;
  onClose: () => void;
  onReset: () => void;
  onCopyLink: (value: string) => void;
}

export default function InviteUserModal({
  open,
  email,
  onEmailChange,
  role,
  onRoleChange,
  message,
  onMessageChange,
  roleOptions,
  inviteUrl,
  inviteEmailDelivery,
  inviteEmailConfigured,
  inviteCapabilitiesLoading,
  isCreatingInvite,
  error,
  onCreateInvitation,
  onClose,
  onReset,
  onCopyLink,
}: InviteUserModalProps) {
  if (!open) {
    return null;
  }

  const canSendEmail = inviteEmailConfigured && !inviteCapabilitiesLoading;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 app-popup-backdrop" onClick={onReset} />
        <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-app-text-heading">Invite New User</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-app-text-subtle hover:text-app-text-muted"
              aria-label="Close invite modal"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ErrorBanner message={error} className="mb-4" />

          {inviteUrl ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-app-border bg-app-accent-soft p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-app-accent-text">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                    ? 'Invitation Created'
                    : 'Invitation Ready'}
                </div>
                <p className="text-sm text-app-accent-text">
                  {inviteEmailDelivery?.requested && inviteEmailDelivery?.sent ? (
                    <>
                      Invitation email sent to <strong>{email}</strong>. You can also share the
                      link manually.
                    </>
                  ) : (
                    <>
                      Share this link with <strong>{email}</strong> to let them create their
                      account.
                    </>
                  )}
                </p>
                {inviteEmailDelivery?.reason && (
                  <p className="mt-2 text-xs text-app-accent-text">{inviteEmailDelivery.reason}</p>
                )}
              </div>

              <div className="rounded-lg bg-app-surface-muted p-3">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  title="Invitation URL"
                  aria-label="Invitation URL"
                  className="w-full bg-transparent text-sm text-app-text-muted border-none focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => onCopyLink(inviteUrl)}
                className="w-full rounded-lg bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
              >
                Copy Link
              </button>

              <button
                type="button"
                onClick={onReset}
                className="w-full rounded-lg px-4 py-2 text-app-text-muted hover:bg-app-surface-muted"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-app-text-label">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-app-text-label">Role *</label>
                <select
                  value={role}
                  onChange={(e) => onRoleChange(e.target.value)}
                  title="Select user role"
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-app-accent"
                >
                  {roleOptions.length === 0 ? (
                    <option value={role}>{getInvitationRoleDisplayLabel(role, {})}</option>
                  ) : (
                    roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.description ? ` - ${option.description}` : ''}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-xs text-app-text-muted">
                  The user will be assigned this role when they create their account.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-app-text-label">
                  Personal Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value)}
                  placeholder="Welcome to our team! Looking forward to working with you."
                  rows={3}
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>

              {!inviteEmailConfigured && !inviteCapabilitiesLoading && (
                <div className="rounded-md border border-app-border bg-app-accent-soft px-3 py-2 text-xs text-app-accent-text">
                  Email delivery is not configured. You can still create and share invite links.
                </div>
              )}

              {inviteCapabilitiesLoading && (
                <div className="rounded-md border border-app-border bg-app-surface-muted px-3 py-2 text-xs text-app-text-muted">
                  Checking email delivery configuration...
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={onReset}
                  className="px-4 py-2 text-app-text-muted hover:bg-app-surface-muted rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onCreateInvitation(false)}
                  disabled={isCreatingInvite || !email}
                  className="px-4 py-2 bg-app-surface-muted text-app-text rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                >
                  {isCreatingInvite ? 'Creating...' : 'Create Link'}
                </button>
                <button
                  type="button"
                  onClick={() => onCreateInvitation(true)}
                  disabled={
                    isCreatingInvite ||
                    !email ||
                    !canSendEmail
                  }
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
                >
                  {isCreatingInvite ? 'Creating...' : 'Create + Send Email'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
