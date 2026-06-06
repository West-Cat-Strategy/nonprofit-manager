import AdminModalShell from './AdminModalShell';
import type { PortalUser } from '../types';

type PortalResetPasswordModalProps = {
  open: boolean;
  target: PortalUser | null;
  password: string;
  confirmPassword: string;
  loading: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function PortalResetPasswordModal({
  open,
  target,
  password,
  confirmPassword,
  loading,
  onPasswordChange,
  onConfirmPasswordChange,
  onClose,
  onSubmit,
}: PortalResetPasswordModalProps) {
  if (!open || !target) {
    return null;
  }

  return (
    <AdminModalShell
      title="Reset Portal Password"
      description={
        <>
          This will immediately replace the portal password for{' '}
          <span className="font-medium">{target.email}</span>.
        </>
      }
      closeLabel="Close portal password reset modal"
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
            disabled={loading}
            className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="portal-reset-password-new"
            className="block text-sm font-medium text-app-text-muted mb-1"
          >
            New Password
          </label>
          <input
            id="portal-reset-password-new"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="New password (min 8 chars)"
            className="w-full px-3 py-2 border border-app-input-border rounded-lg"
          />
        </div>
        <div>
          <label
            htmlFor="portal-reset-password-confirm"
            className="block text-sm font-medium text-app-text-muted mb-1"
          >
            Confirm Password
          </label>
          <input
            id="portal-reset-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-3 py-2 border border-app-input-border rounded-lg"
          />
        </div>
      </div>
    </AdminModalShell>
  );
}
