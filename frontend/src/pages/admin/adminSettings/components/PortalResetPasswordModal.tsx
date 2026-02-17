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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-app-text mb-2">Reset Portal Password</h3>
          <p className="text-sm text-app-text-muted">
            This will immediately replace the portal password for{' '}
            <span className="font-medium">{target.email}</span>.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg"
              />
            </div>
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
              disabled={loading}
              className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
