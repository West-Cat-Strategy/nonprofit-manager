import ErrorBanner from '../../../../../components/ErrorBanner';
import type { UserSecurityInfo } from '../types';

interface ResetUserEmailModalProps {
  open: boolean;
  selectedUser: UserSecurityInfo | null;
  newEmail: string;
  error: string | null;
  onNewEmailChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function ResetUserEmailModal({
  open,
  selectedUser,
  newEmail,
  error,
  onNewEmailChange,
  onSubmit,
  onClose,
}: ResetUserEmailModalProps) {
  if (!open || !selectedUser) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 app-popup-backdrop" onClick={onClose} />
        <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-app-text-heading">
              Change Email for {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-app-text-subtle hover:text-app-text-muted"
              aria-label="Close email reset modal"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ErrorBanner message={error} className="mb-4" />

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-label">
              New Email Address
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => onNewEmailChange(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-app-accent"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-app-text-muted hover:bg-app-surface-muted rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
            >
              Update Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
