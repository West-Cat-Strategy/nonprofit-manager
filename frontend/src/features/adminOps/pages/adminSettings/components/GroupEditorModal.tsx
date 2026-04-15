import type { AdminGroup, RoleSelectorItem } from '../types';

interface GroupEditorModalProps {
  open: boolean;
  group: AdminGroup | null;
  roleOptions: RoleSelectorItem[];
  onGroupChange: (nextGroup: AdminGroup) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving?: boolean;
}

export default function GroupEditorModal({
  open,
  group,
  roleOptions,
  onGroupChange,
  onSave,
  onClose,
  isSaving = false,
}: GroupEditorModalProps) {
  if (!open || !group) {
    return null;
  }

  const toggleRole = (roleName: string, checked: boolean) => {
    const nextRoles = checked
      ? [...group.roles, roleName]
      : group.roles.filter((role) => role !== roleName);

    onGroupChange({
      ...group,
      roles: Array.from(new Set(nextRoles)),
    });
  };

  const canSave = group.name.trim().length > 0 && !isSaving;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 app-popup-backdrop" onClick={onClose} />
        <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-app-surface p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-app-text-heading">
                {group.id ? 'Edit Group' : 'Create Group'}
              </h3>
              <p className="mt-1 text-sm text-app-text-muted">
                Groups bundle role access for reusable policy-driven access control.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-app-text-subtle hover:text-app-text-muted"
              aria-label="Close group editor"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-app-text-label">
                Group Name
              </label>
              <input
                type="text"
                value={group.name}
                onChange={(event) => onGroupChange({ ...group, name: event.target.value })}
                placeholder="Volunteer Coordinators"
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-app-text-label">
                Description
              </label>
              <textarea
                value={group.description ?? ''}
                onChange={(event) =>
                  onGroupChange({
                    ...group,
                    description: event.target.value,
                  })
                }
                placeholder="Describe what this policy group covers."
                rows={3}
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-app-text-label">Roles</label>
                <span className="text-xs uppercase tracking-wide text-app-text-muted">
                  {group.roles.length} selected
                </span>
              </div>
              <div className="space-y-3 rounded-lg border border-app-border p-4">
                {roleOptions.length === 0 ? (
                  <p className="text-sm text-app-text-muted">No roles available.</p>
                ) : (
                  roleOptions.map((role) => (
                    <label key={role.value} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={group.roles.includes(role.value)}
                        onChange={(event) => toggleRole(role.value, event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-app-border text-app-accent focus:ring-app-accent"
                      />
                      <span className="text-sm text-app-text-muted">
                        <span className="font-medium text-app-text">{role.label}</span>
                        {role.description ? (
                          <span className="block text-xs text-app-text-subtle">
                            {role.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
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
              disabled={!canSave}
              className="rounded-lg bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : group.id ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
