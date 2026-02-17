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
  const primaryRoleOrder = ['Client', 'Donor', 'Member', 'Volunteer', 'Board Member', 'Contact'];
  const clientSubRoleNames = [
    'Brain Injury Survivor',
    'Support Person',
    'Information',
    'Community Education',
  ];
  const selectedSet = new Set(selectedRoles);
  const primaryPriority = new Map(primaryRoleOrder.map((name, index) => [name, index]));
  const clientSubRoleSet = new Set(clientSubRoleNames);
  const clientRoleSelected = selectedSet.has('Client');

  const visibleBaseRoles = availableRoles.filter((role) => !clientSubRoleSet.has(role.name));
  const clientSubRoles = availableRoles.filter((role) => clientSubRoleSet.has(role.name));
  const orderedRoles = [...visibleBaseRoles].sort((a, b) => {
    const aPriority = primaryPriority.get(a.name);
    const bPriority = primaryPriority.get(b.name);

    if (aPriority !== undefined && bPriority !== undefined) return aPriority - bPriority;
    if (aPriority !== undefined) return -1;
    if (bPriority !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-app-surface shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-app-text mb-4">Roles</h2>
      {rolesLoading ? (
        <div className="text-sm text-app-text-muted">Loading roles...</div>
      ) : availableRoles.length === 0 ? (
        <div className="text-sm text-app-text-muted">No roles available.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orderedRoles.map((role) => {
              const isSelected = selectedSet.has(role.name);
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

          {clientRoleSelected && clientSubRoles.length > 0 && (
            <div className="rounded-lg border border-app-border bg-app-bg-subtle p-4">
              <h3 className="text-sm font-medium text-app-text mb-3">Client Type</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clientSubRoles.map((role) => {
                  const isSelected = selectedSet.has(role.name);
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
