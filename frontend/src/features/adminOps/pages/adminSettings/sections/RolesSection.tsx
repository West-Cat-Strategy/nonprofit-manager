<<<<<<< HEAD
import type { PermissionCatalogItem, Role } from '../types';
import { groupPermissionsByCategory } from '../utils';

interface RolesSectionProps {
  roles: Role[];
  permissions: PermissionCatalogItem[];
=======
import type { Role } from '../types';
import { defaultPermissions } from '../constants';

interface RolesSectionProps {
  roles: Role[];
>>>>>>> origin/main
  onCreateRole: () => void;
  onEditRole: (role: Role) => void;
  onDeleteRole: (roleId: string) => void;
}

<<<<<<< HEAD
export default function RolesSection({
  roles,
  permissions,
  onCreateRole,
  onEditRole,
  onDeleteRole,
}: RolesSectionProps) {
  const permissionsByName = new Map(permissions.map((permission) => [permission.name, permission]));
  const groupedPermissions = groupPermissionsByCategory(permissions);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-app-border bg-app-surface-muted px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-app-text">Roles &amp; Permissions</h2>
            <p className="mt-1 text-sm text-app-text-muted">
              Define access levels from the canonical role catalog.
            </p>
=======
export default function RolesSection({ roles, onCreateRole, onEditRole, onDeleteRole }: RolesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-app-text">Roles &amp; Permissions</h2>
            <p className="text-sm text-app-text-muted mt-1">Define access levels and permissions for users</p>
>>>>>>> origin/main
          </div>
          <button
            type="button"
            onClick={onCreateRole}
<<<<<<< HEAD
            className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
=======
            className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] text-sm font-medium rounded-lg hover:bg-app-accent-hover"
>>>>>>> origin/main
          >
            Create Role
          </button>
        </div>

        <div className="divide-y divide-app-border">
<<<<<<< HEAD
          {roles.length === 0 ? (
            <div className="p-6 text-sm text-app-text-muted">No roles found.</div>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="p-6 hover:bg-app-surface-muted">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-app-text">{role.label}</h3>
                      <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs font-medium text-app-text-muted">
                        {role.name}
                      </span>
                      {role.isSystem && (
                        <span className="rounded-full bg-app-accent-soft px-2 py-0.5 text-xs font-medium text-app-accent-text">
                          System
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-app-text-muted">
                      {role.description || 'No description provided.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {role.permissions.slice(0, 5).map((permissionName) => {
                        const permission = permissionsByName.get(permissionName);
                        return (
                          <span
                            key={permissionName}
                            className="rounded-full bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text"
                          >
                            {permission?.label || permissionName}
                          </span>
                        );
                      })}
                      {role.permissions.length > 5 && (
                        <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                          +{role.permissions.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-app-text-muted">{role.userCount} users</span>
                    <button
                      type="button"
                      onClick={() => onEditRole(role)}
                      className="text-sm font-medium text-app-accent hover:text-app-accent-hover"
                    >
                      Edit
                    </button>
                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => onDeleteRole(role.id)}
                        className="text-sm font-medium text-app-accent hover:text-app-accent-text"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
          <h2 className="text-lg font-semibold text-app-text">Available Permissions</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Reference of the permission catalog returned by the backend.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupedPermissions.length === 0 ? (
              <div className="text-sm text-app-text-muted">No permissions found.</div>
            ) : (
              groupedPermissions.map((group) => (
                <div key={group.category} className="rounded-lg border border-app-border p-4">
                  <h4 className="mb-2 font-medium text-app-text">{group.category}</h4>
                  <ul className="space-y-2">
                    {group.items.map((permission) => (
                      <li
                        key={permission.id}
                        className="flex items-start gap-2 text-sm text-app-text-muted"
                      >
                        <span className="mt-1 h-2 w-2 rounded-full bg-app-accent" />
                        <span>
                          <span className="font-medium text-app-text">{permission.label}</span>
                          {permission.description ? (
                            <span className="block text-xs text-app-text-subtle">
                              {permission.description}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
=======
          {roles.map((role) => (
            <div key={role.id} className="p-6 hover:bg-app-surface-muted">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-sm font-semibold text-app-text">{role.name}</h3>
                    {role.isSystem && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-app-surface-muted text-app-text-muted rounded-full">
                        System
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">{role.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.permissions.slice(0, 5).map((perm) => (
                      <span key={perm} className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent rounded">
                        {perm}
                      </span>
                    ))}
                    {role.permissions.length > 5 && (
                      <span className="px-2 py-0.5 text-xs bg-app-surface-muted text-app-text-muted rounded">
                        +{role.permissions.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-app-text-muted">{role.userCount} users</span>
                  <button
                    type="button"
                    onClick={() => onEditRole(role)}
                    className="text-app-accent hover:text-app-accent text-sm font-medium"
                  >
                    Edit
                  </button>
                  {!role.isSystem && (
                    <button
                      type="button"
                      onClick={() => onDeleteRole(role.id)}
                      className="text-app-accent hover:text-app-accent-text text-sm font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text">Available Permissions</h2>
          <p className="text-sm text-app-text-muted mt-1">Reference of all available permissions</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(
              defaultPermissions.reduce((acc, perm) => {
                if (!acc[perm.category]) acc[perm.category] = [];
                acc[perm.category].push(perm);
                return acc;
              }, {} as Record<string, typeof defaultPermissions>)
            ).map(([category, perms]) => (
              <div key={category} className="border border-app-border rounded-lg p-4">
                <h4 className="font-medium text-app-text mb-2">{category}</h4>
                <ul className="space-y-1">
                  {perms.map((perm) => (
                    <li key={perm.key} className="text-sm text-app-text-muted flex items-center">
                      <span className="w-2 h-2 bg-app-accent rounded-full mr-2"></span>
                      {perm.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
>>>>>>> origin/main
          </div>
        </div>
      </div>
    </div>
  );
}
<<<<<<< HEAD

=======
>>>>>>> origin/main
