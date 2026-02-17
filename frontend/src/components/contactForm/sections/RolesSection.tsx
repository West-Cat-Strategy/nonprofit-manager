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
    <div className="bg-app-surface shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-app-text mb-4">Roles</h2>
      {rolesLoading ? (
        <div className="text-sm text-app-text-muted">Loading roles...</div>
      ) : availableRoles.length === 0 ? (
        <div className="text-sm text-app-text-muted">No roles available.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableRoles.map((role) => {
            const isSelected = selectedRoles.includes(role.name);
            return (
              <label
                key={role.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-app-accent bg-app-accent-soft'
                    : 'border-app-border bg-app-surface hover:border-app-input-border'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleRole(role.name)}
                  className="mt-1 h-4 w-4 text-app-accent border-app-input-border rounded focus:ring-app-accent"
                />
                <div>
                  <div className="font-medium text-app-text">[{role.name}]</div>
                  {role.description && (
                    <div className="text-xs text-app-text-muted">{role.description}</div>
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
