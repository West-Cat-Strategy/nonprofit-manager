import { Link, useLocation, useSearchParams } from 'react-router-dom';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { PageHeader, SectionCard } from '../../../components/ui';
import { useDashboardSettings } from '../../../hooks/useDashboardSettings';
import { getRouteMeta } from '../../../routes/routeMeta';
import { isDemoPath } from '../../../services/loop/demo';
import DashboardViewSettingsPanel from '../components/DashboardViewSettingsPanel';
import { WorkbenchPanels } from '../components/workbench';
import { DashboardDataProvider, WORKBENCH_DASHBOARD_LANES } from '../context/DashboardDataContext';

function WorkbenchDashboardContent() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dashboardMeta = getRouteMeta('/dashboard');
  const primaryAction = dashboardMeta.primaryAction;
  const { settings, setSettings, resetSettings } = useDashboardSettings();

  const settingsOpen = searchParams.get('panel') === 'settings';
  const isDemoRoute = isDemoPath(location.pathname);

  const toggleSettingsPanel = () => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (settingsOpen) {
      nextSearchParams.delete('panel');
    } else {
      nextSearchParams.set('panel', 'settings');
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  return (
    <NeoBrutalistLayout pageTitle="WORKBENCH">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-4 sm:px-6 sm:py-8 lg:px-8">
        <PageHeader
          badge={
            <span className="rounded-full border border-app-border bg-app-surface-elevated px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-app-text-heading shadow-sm">
              Staff workspace
            </span>
          }
          title="Workbench"
          description="Start with urgent work and assigned follow-ups, then open deeper workspace tools only when you need them."
          actions={
            primaryAction ? (
              <Link
                to={primaryAction.path}
                className="inline-flex items-center justify-center rounded-xl border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
              >
                {primaryAction.label}
              </Link>
            ) : undefined
          }
        />

        <WorkbenchPanels
          settings={settings}
          loadSavedQueues={!isDemoRoute}
          setupPanel={
            <SectionCard
              title="Workbench setup"
              subtitle="Keep navigation and shortcuts in the shared header, and drop into customization only when you want to tune this home screen."
              actions={
                <>
                  <button
                    type="button"
                    onClick={toggleSettingsPanel}
                    className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-4 py-2 text-sm font-semibold text-app-text-heading shadow-sm transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                    aria-expanded={settingsOpen}
                    aria-controls="dashboard-view-settings"
                  >
                    {settingsOpen ? 'Close View Settings' : 'Customize View'}
                  </button>
                  <Link
                    to="/dashboard/custom"
                    className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-4 py-2 text-sm font-semibold text-app-text-heading shadow-sm transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                  >
                    Open Layout Editor
                  </Link>
                </>
              }
            >
              <p className="max-w-3xl text-sm leading-6 text-app-text-muted">
                The shared header already carries your navigation and pinned shortcuts, so the workbench can stay focused on triage.
                Use these controls when you want to change the visible sections or move into the full layout editor.
              </p>

              {settingsOpen ? (
                <div id="dashboard-view-settings" className="mt-4">
                  <DashboardViewSettingsPanel
                    settings={settings}
                    onSettingsChange={setSettings}
                    onReset={resetSettings}
                  />
                </div>
              ) : null}
            </SectionCard>
          }
        />
      </div>
    </NeoBrutalistLayout>
  );
}

export default function WorkbenchDashboardPage() {
  return (
    <DashboardDataProvider lanes={WORKBENCH_DASHBOARD_LANES}>
      <WorkbenchDashboardContent />
    </DashboardDataProvider>
  );
}
