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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Roles &amp; Permissions</h2>
            <p className="text-sm text-gray-500 mt-1">Define access levels and permissions for users</p>
          </div>
          <button
            type="button"
            onClick={onCreateRole}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Create Role
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {roles.map((role) => (
            <div key={role.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-sm font-semibold text-gray-900">{role.name}</h3>
                    {role.isSystem && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        System
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{role.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.permissions.slice(0, 5).map((perm) => (
                      <span key={perm} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                        {perm}
                      </span>
                    ))}
                    {role.permissions.length > 5 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        +{role.permissions.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{role.userCount} users</span>
                  <button
                    type="button"
                    onClick={() => onEditRole(role)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Available Permissions</h2>
          <p className="text-sm text-gray-500 mt-1">Reference of all available permissions</p>
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
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                <ul className="space-y-1">
                  {perms.map((perm) => (
                    <li key={perm.key} className="text-sm text-gray-600 flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
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
