import type { Role } from '../types';
import { defaultPermissions } from '../constants';

interface RolesSectionProps {
  roles: Role[];
  onCreateRole: () => void;
  onEditRole: (role: Role) => void;
  onDeleteRole: (roleId: string) => void;
}

export default function RolesSection({ roles, onCreateRole, onEditRole, onDeleteRole }: RolesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-app-text">Roles &amp; Permissions</h2>
            <p className="text-sm text-app-text-muted mt-1">Define access levels and permissions for users</p>
          </div>
          <button
            type="button"
            onClick={onCreateRole}
            className="px-4 py-2 bg-app-accent text-white text-sm font-medium rounded-lg hover:bg-app-accent-hover"
          >
            Create Role
          </button>
        </div>

        <div className="divide-y divide-app-border">
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
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
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
          </div>
        </div>
      </div>
    </div>
  );
}
