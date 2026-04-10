import type { PermissionCatalogItem, Role } from '../types';
import { groupPermissionsByCategory } from '../utils';

interface RoleEditorModalProps {
  open: boolean;
  role: Role | null;
  permissions: PermissionCatalogItem[];
  onRoleChange: (nextRole: Role) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function RoleEditorModal({
  open,
  role,
  permissions,
  onRoleChange,
  onSave,
  onClose,
}: RoleEditorModalProps) {
  if (!open || !role) {
    return null;
  }

  const groupedPermissions = groupPermissionsByCategory(permissions);
  const canSave = role.name.trim().length > 0 || role.isSystem;

  const togglePermission = (permissionName: string, checked: boolean) => {
    const nextPermissions = checked
      ? [...role.permissions, permissionName]
      : role.permissions.filter((permission) => permission !== permissionName);

    onRoleChange({
      ...role,
      permissions: Array.from(new Set(nextPermissions)),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 app-popup-backdrop" onClick={onClose} />
        <div className="relative bg-app-surface rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-app-text-heading">
                {role.id ? 'Edit Role' : 'Create Role'}
              </h3>
              <p className="mt-1 text-sm text-app-text-muted">
                System role slugs stay fixed. Custom roles can be renamed and re-scoped.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-app-text-subtle hover:text-app-text-muted"
              aria-label="Close role editor"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Role Slug
              </label>
              <input
                type="text"
                value={role.name}
                onChange={(e) => onRoleChange({ ...role, name: e.target.value })}
                placeholder="Enter role slug"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                disabled={role.isSystem}
              />
              <p className="mt-1 text-xs text-app-text-muted">
                Saved slugs are normalized to lowercase hyphenated values. System roles cannot be
                renamed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Description
              </label>
              <input
                type="text"
                value={role.description}
                onChange={(e) => onRoleChange({ ...role, description: e.target.value })}
                placeholder="Describe this role's purpose"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-app-text-label">
                  Permissions
                </label>
                <span className="text-xs uppercase tracking-wide text-app-text-muted">
                  {role.permissions.length} selected
                </span>
              </div>

              <div className="space-y-4 rounded-lg border border-app-border p-4">
                {groupedPermissions.length === 0 ? (
                  <p className="text-sm text-app-text-muted">No permissions available.</p>
                ) : (
                  groupedPermissions.map((group) => (
                    <fieldset key={group.category} className="space-y-3">
                      <legend className="text-sm font-semibold text-app-text">
                        {group.category}
                      </legend>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {group.items.map((permission) => (
                          <label key={permission.name} className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={role.permissions.includes(permission.name)}
                              onChange={(event) =>
                                togglePermission(permission.name, event.target.checked)
                              }
                              className="mt-1 h-4 w-4 rounded border-app-border text-app-accent focus:ring-app-accent"
                            />
                            <span className="text-sm text-app-text-muted">
                              <span className="font-medium text-app-text">{permission.label}</span>
                              {permission.description ? (
                                <span className="block text-xs text-app-text-subtle">
                                  {permission.description}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))
                )}
              </div>
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
              onClick={onSave}
              disabled={!canSave}
              className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
            >
              {role.id ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
