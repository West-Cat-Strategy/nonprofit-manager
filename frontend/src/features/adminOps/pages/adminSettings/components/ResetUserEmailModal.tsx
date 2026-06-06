import ErrorBanner from '../../../../../components/ErrorBanner';
import AdminModalShell from './AdminModalShell';
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
    <AdminModalShell
      title={`Change Email for ${selectedUser.firstName} ${selectedUser.lastName}`}
      closeLabel="Close email reset modal"
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
            Update Email
          </button>
        </>
      }
    >
      <ErrorBanner message={error} className="mb-4" />

      <div>
        <label
          htmlFor="admin-reset-email-new"
          className="mb-1 block text-sm font-medium text-app-text-label"
        >
          New Email Address
        </label>
        <input
          id="admin-reset-email-new"
          type="email"
          value={newEmail}
          onChange={(e) => onNewEmailChange(e.target.value)}
          placeholder="user@example.com"
          className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-app-accent"
        />
      </div>
    </AdminModalShell>
  );
}
