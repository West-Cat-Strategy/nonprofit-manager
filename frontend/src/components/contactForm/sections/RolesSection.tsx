import type { ContactRole } from '../../../types/contact';

interface RolesSectionProps {
  rolesLoading: boolean;
  availableRoles: ContactRole[];
  selectedRoles: string[];
  onToggleRole: (roleName: string) => void;
}

export default function RolesSection({
  rolesLoading,
  availableRoles,
  selectedRoles,
  onToggleRole,
}: RolesSectionProps) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Roles</h2>
      {rolesLoading ? (
        <div className="text-sm text-gray-500">Loading roles...</div>
      ) : availableRoles.length === 0 ? (
        <div className="text-sm text-gray-500">No roles available.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableRoles.map((role) => {
            const isSelected = selectedRoles.includes(role.name);
            return (
              <label
                key={role.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleRole(role.name)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">{role.name}</div>
                  {role.description && (
                    <div className="text-xs text-gray-500">{role.description}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
