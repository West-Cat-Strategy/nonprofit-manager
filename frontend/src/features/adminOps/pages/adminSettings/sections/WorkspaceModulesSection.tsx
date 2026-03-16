import SaveBar from '../components/SaveBar';
import {
  workspaceModuleDefinitions,
  workspaceModuleGroupOrder,
  type WorkspaceModuleKey,
  type WorkspaceModuleSettings,
} from '../../../../workspaceModules/catalog';
import type { SaveStatus } from '../types';

interface WorkspaceModulesSectionProps {
  workspaceModules: WorkspaceModuleSettings;
  onToggleModule: (key: WorkspaceModuleKey) => void;
  onSave: () => void;
  isSaving: boolean;
  saveStatus: SaveStatus;
  isDirty: boolean;
  lastSavedAt: Date | null;
}

const sectionCardClassName =
  'bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden';
const sectionHeaderClassName =
  'px-6 py-4 border-b border-app-border bg-app-surface-muted';

export default function WorkspaceModulesSection({
  workspaceModules,
  onToggleModule,
  onSave,
  isSaving,
  saveStatus,
  isDirty,
  lastSavedAt,
}: WorkspaceModulesSectionProps) {
  return (
    <div className="space-y-6">
      <div className={sectionCardClassName}>
        <div className={sectionHeaderClassName}>
          <h2 className="text-lg font-semibold text-app-text-heading">Workspace Modules</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Control which staff work areas are available in this workspace. Disabled modules are
            hidden from navigation and blocked for direct staff access.
          </p>
        </div>

        <div className="divide-y divide-app-border">
          {workspaceModuleGroupOrder.map((group) => {
            const groupModules = workspaceModuleDefinitions.filter(
              (moduleDefinition) => moduleDefinition.group === group
            );

            return (
              <section key={group} className="p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-app-text-muted">
                    {group}
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {groupModules.map((moduleDefinition) => {
                    const enabled = workspaceModules[moduleDefinition.key];

                    return (
                      <article
                        key={moduleDefinition.key}
                        className="rounded-lg border border-app-border bg-app-surface-elevated p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-app-text-heading">
                              {moduleDefinition.label}
                            </h4>
                            <p className="mt-1 text-sm text-app-text-muted">
                              {moduleDefinition.description}
                            </p>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => onToggleModule(moduleDefinition.key)}
                              aria-label={`${moduleDefinition.label} enabled`}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-app-surface-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-app-accent-soft rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-app-surface after:border-app-input-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-app-accent" />
                            <span className="ms-3 text-sm font-medium text-app-text-label">
                              {enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </label>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <SaveBar
          isSaving={isSaving}
          saveStatus={saveStatus}
          isDirty={isDirty}
          lastSavedAt={lastSavedAt}
          onSave={onSave}
        />
      </div>

      <div className={sectionCardClassName}>
        <div className={sectionHeaderClassName}>
          <h2 className="text-lg font-semibold text-app-text-heading">Always Available</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            These areas stay available so staff can always sign in, reach the dashboard, and access
            administration surfaces needed to re-enable workspace modules.
          </p>
        </div>
        <div className="p-6">
          <ul className="grid gap-3 md:grid-cols-2">
            {['Dashboard', 'User Settings', 'Admin Settings', 'Navigation Settings'].map(
              (fixedArea) => (
                <li
                  key={fixedArea}
                  className="rounded-lg border border-app-border bg-app-surface-elevated px-4 py-3 text-sm font-medium text-app-text"
                >
                  {fixedArea}
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
