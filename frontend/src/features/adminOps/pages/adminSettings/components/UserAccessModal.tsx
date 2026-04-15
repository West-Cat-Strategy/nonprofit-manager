import type { AdminGroup, OrganizationAccount, UserSecurityInfo } from '../types';

interface UserAccessModalProps {
  open: boolean;
  user: UserSecurityInfo | null;
  groups: AdminGroup[];
  organizationAccounts: OrganizationAccount[];
  draftGroups: string[];
  draftOrganizationAccess: string[];
  onDraftGroupsChange: (nextGroups: string[]) => void;
  onDraftOrganizationAccessChange: (nextOrganizationAccess: string[]) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving?: boolean;
  error?: string | null;
}

export default function UserAccessModal({
  open,
  user,
  groups,
  organizationAccounts,
  draftGroups,
  draftOrganizationAccess,
  onDraftGroupsChange,
  onDraftOrganizationAccessChange,
  onSave,
  onClose,
  isSaving = false,
  error,
}: UserAccessModalProps) {
  if (!open || !user) {
    return null;
  }

  const toggleValue = (
    value: string,
    currentValues: string[],
    onChange: (nextValues: string[]) => void,
    checked: boolean
  ) => {
    const nextValues = checked
      ? [...currentValues, value]
      : currentValues.filter((item) => item !== value);
    onChange(Array.from(new Set(nextValues)));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 app-popup-backdrop" onClick={onClose} />
        <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-app-surface p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-app-text-heading">Manage Access</h3>
              <p className="mt-1 text-sm text-app-text-muted">
                Update group membership and organization access for {user.email}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-app-text-subtle hover:text-app-text-muted"
              aria-label="Close access editor"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mb-5 rounded-lg border border-app-border bg-app-surface-muted p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-app-text">
                {user.firstName} {user.lastName}
              </span>
              <span className="rounded-full bg-app-accent-soft px-2 py-0.5 text-xs font-medium text-app-accent-text">
                {user.role}
              </span>
              <span className="rounded-full bg-app-surface px-2 py-0.5 text-xs font-medium text-app-text">
                {user.mfaTotpEnabled ? '2FA enabled' : '2FA disabled'}
              </span>
              <span className="rounded-full bg-app-surface px-2 py-0.5 text-xs font-medium text-app-text">
                {user.passkeyCount ? `${user.passkeyCount} passkeys` : 'No passkeys'}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-app-text">Groups</legend>
              <p className="text-sm text-app-text-muted">
                Groups inherit access through their role assignments.
              </p>
              <div className="space-y-2 rounded-lg border border-app-border p-4">
                {groups.length === 0 ? (
                  <p className="text-sm text-app-text-muted">No groups available.</p>
                ) : (
                  groups.map((group) => (
                    <label key={group.id} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={draftGroups.includes(group.id)}
                        onChange={(event) =>
                          toggleValue(group.id, draftGroups, onDraftGroupsChange, event.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-app-border text-app-accent focus:ring-app-accent"
                      />
                      <span className="text-sm text-app-text-muted">
                        <span className="font-medium text-app-text">{group.name}</span>
                        {group.description ? (
                          <span className="block text-xs text-app-text-subtle">
                            {group.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-app-text">
                Organization Access
              </legend>
              <p className="text-sm text-app-text-muted">
                Assign this account to the organization workspaces it can access.
              </p>
              <div className="space-y-2 rounded-lg border border-app-border p-4">
                {organizationAccounts.length === 0 ? (
                  <p className="text-sm text-app-text-muted">No organization accounts available.</p>
                ) : (
                  organizationAccounts.map((account) => (
                    <label key={account.id} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={draftOrganizationAccess.includes(account.id)}
                        onChange={(event) =>
                          toggleValue(
                            account.id,
                            draftOrganizationAccess,
                            onDraftOrganizationAccessChange,
                            event.target.checked
                          )
                        }
                        className="mt-1 h-4 w-4 rounded border-app-border text-app-accent focus:ring-app-accent"
                      />
                      <span className="text-sm text-app-text-muted">
                        <span className="font-medium text-app-text">
                          {account.label || account.name}
                        </span>
                        {account.description ? (
                          <span className="block text-xs text-app-text-subtle">
                            {account.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </fieldset>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-app-text-muted hover:bg-app-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="rounded-lg bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Access'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
