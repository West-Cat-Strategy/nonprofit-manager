import ErrorBanner from '../../../../../components/ErrorBanner';
import AdminModalShell from './AdminModalShell';
import type { UserSecurityInfo } from '../types';

interface ResetUserPasswordModalProps {
  open: boolean;
  selectedUser: UserSecurityInfo | null;
  newPassword: string;
  confirmPassword: string;
  error: string | null;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function ResetUserPasswordModal({
  open,
  selectedUser,
  newPassword,
  confirmPassword,
  error,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onClose,
}: ResetUserPasswordModalProps) {
  if (!open || !selectedUser) {
    return null;
  }

  return (
    <AdminModalShell
      title={`Reset Password for ${selectedUser.firstName} ${selectedUser.lastName}`}
      closeLabel="Close password reset modal"
      onClose={onClose}
      footer={
        <>
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
            Reset Password
          </button>
        </>
      }
    >
      <ErrorBanner message={error} className="mb-4" />

      <div className="space-y-4">
        <div>
          <label
            htmlFor="admin-reset-password-new"
            className="mb-1 block text-sm font-medium text-app-text-label"
          >
            New Password
          </label>
          <input
            id="admin-reset-password-new"
            type="password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            placeholder="Enter new password"
            className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-app-accent"
          />
        </div>
        <div>
          <label
            htmlFor="admin-reset-password-confirm"
            className="mb-1 block text-sm font-medium text-app-text-label"
          >
            Confirm Password
          </label>
          <input
            id="admin-reset-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-app-accent"
          />
        </div>
      </div>
    </AdminModalShell>
  );
}
