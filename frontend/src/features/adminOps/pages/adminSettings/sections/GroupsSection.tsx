import type { AdminGroup, RoleSelectorItem } from '../types';
import { getRoleDisplayLabel } from '../utils';

interface GroupsSectionProps {
  groups: AdminGroup[];
  roleOptions: RoleSelectorItem[];
  loading: boolean;
  onCreateGroup: () => void;
  onEditGroup: (group: AdminGroup) => void;
  onDeleteGroup: (groupId: string) => void;
}

export default function GroupsSection({
  groups,
  roleOptions,
  loading,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
}: GroupsSectionProps) {
  const roleLabelMap: Record<string, string> = Object.fromEntries(
    roleOptions.map((item) => [item.value, item.label])
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-app-border bg-app-surface-muted px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-app-text-heading">Groups &amp; Policy</h2>
            <p className="mt-1 text-sm text-app-text-muted">
              Bundle role access into reusable groups for consistent account management.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateGroup}
            className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
          >
            Create Group
          </button>
        </div>

        <div className="divide-y divide-app-border">
          {loading ? (
            <div className="p-6 text-sm text-app-text-muted">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="p-6 text-sm text-app-text-muted">No groups found.</div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="p-6 hover:bg-app-surface-muted">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-app-text">{group.name}</h3>
                      {group.isSystem && (
                        <span className="rounded-full bg-app-accent-soft px-2 py-0.5 text-xs font-medium text-app-accent-text">
                          System
                        </span>
                      )}
                      <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs font-medium text-app-text-muted">
                        {group.memberCount} members
                      </span>
                    </div>
                    <p className="text-sm text-app-text-muted">
                      {group.description || 'No description provided.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.roles.length === 0 ? (
                        <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                          No roles assigned
                        </span>
                      ) : (
                        group.roles.map((role) => (
                          <span
                            key={role}
                            className="rounded-full bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text"
                          >
                            {getRoleDisplayLabel(role, roleLabelMap)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onEditGroup(group)}
                      className="text-sm font-medium text-app-accent hover:text-app-accent-hover"
                    >
                      Edit
                    </button>
                    {!group.isSystem && (
                      <button
                        type="button"
                        onClick={() => onDeleteGroup(group.id)}
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
          <h2 className="text-lg font-semibold text-app-text-heading">How Groups Work</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Groups map users into reusable role bundles and then inherit the permissions of those
            roles.
          </p>
        </div>
        <div className="space-y-4 p-6 text-sm text-app-text-muted">
          <p>
            Use groups when you want to manage common access patterns without assigning roles to
            users one-by-one.
          </p>
          <p>
            For example, a volunteer coordination group can inherit the staff and volunteer roles
            while the admin workspace keeps elevated access separate.
          </p>
        </div>
      </div>
    </div>
  );
}
