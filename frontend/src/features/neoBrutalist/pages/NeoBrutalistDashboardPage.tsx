import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import {
  DashboardCustomizer,
  QuickActionsWidget,
  QuickLookupWidget,
} from '../../../components/dashboard';
import { preloadContactsPeopleRoute } from '../../contacts/routePreload';
import { preloadNavigationQuickLookupDialog } from '../../../components/navigation/preloadNavigationQuickLookupDialog';
import { useDashboardSettings } from '../../../hooks/useDashboardSettings';
import {
  useNavigationPreferences,
  type NavigationItem,
} from '../../../hooks/useNavigationPreferences';
import { getRouteCatalogEntryById } from '../../../routes/routeCatalog';
import { getRouteMeta } from '../../../routes/routeMeta';

type WorkbenchLink = NavigationItem & {
  sectionLabel: string;
};

interface SummaryMetricProps {
  label: string;
  value: string;
  description: string;
}

function SummaryMetric({ label, value, description }: SummaryMetricProps) {
  return (
    <div className="rounded-2xl border border-app-border/70 bg-app-surface-muted/70 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-app-text-heading">{value}</p>
      <p className="mt-1 text-sm text-app-text-muted">{description}</p>
    </div>
  );
}

interface WorkstreamPanelProps {
  title: string;
  description: string;
  items: WorkbenchLink[];
  emptyState: string;
  manageLabel?: string;
  manageTo?: string;
}

function WorkstreamPanel({
  title,
  description,
  items,
  emptyState,
  manageLabel,
  manageTo,
}: WorkstreamPanelProps) {
  return (
    <section className="rounded-2xl border border-app-border/70 bg-app-surface/85 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text-heading">{title}</h2>
          <p className="mt-1 text-sm text-app-text-muted">{description}</p>
        </div>
        {manageLabel && manageTo ? (
          <Link
            to={manageTo}
            className="inline-flex items-center rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-medium text-app-text transition hover:bg-app-hover"
          >
            {manageLabel}
          </Link>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="group rounded-2xl border border-app-border bg-app-surface px-4 py-3 transition hover:-translate-y-0.5 hover:bg-app-hover"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent-soft text-lg text-app-accent-text"
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-app-text-heading">
                    {item.shortLabel ?? item.name}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-app-text-subtle">
                    {item.sectionLabel}
                  </p>
                </div>
                <span className="text-app-text-subtle transition group-hover:text-app-text" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-app-border bg-app-surface-muted/60 px-4 py-5 text-sm text-app-text-muted">
          {emptyState}
        </div>
      )}
    </section>
  );
}

export default function NeoBrutalistDashboard() {
  const navigate = useNavigate();
  const dashboardMeta = getRouteMeta('/dashboard');
  const primaryAction = dashboardMeta.primaryAction;
  const { settings, setSettings, resetSettings } = useDashboardSettings();
  const { pinnedItems, enabledItems } = useNavigationPreferences();
  const [showCustomize, setShowCustomize] = useState(false);

  const pinnedWorkstreams = useMemo<WorkbenchLink[]>(
    () =>
      pinnedItems.map((item) => ({
        ...item,
        sectionLabel: getRouteCatalogEntryById(item.id)?.section ?? 'Core',
      })),
    [pinnedItems]
  );

  const enabledWorkstreams = useMemo<WorkbenchLink[]>(
    () =>
      enabledItems
        .filter((item) => item.id !== 'dashboard' && !item.pinned)
        .map((item) => ({
          ...item,
          sectionLabel: getRouteCatalogEntryById(item.id)?.section ?? 'Core',
        })),
    [enabledItems]
  );

  const activeSectionCount = useMemo(
    () =>
      new Set(
        enabledItems
          .filter((item) => item.id !== 'dashboard')
          .map((item) => getRouteCatalogEntryById(item.id)?.section ?? 'Core')
      ).size,
    [enabledItems]
  );

  const totalWorkstreams = enabledItems.filter((item) => item.id !== 'dashboard').length;

  useEffect(() => {
    let timeoutId: number | null = null;
    let idleHandle: number | null = null;
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: {
          timeout?: number;
        }
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const prefetchStartupAdjacencies = () => {
      void preloadContactsPeopleRoute();
      void preloadNavigationQuickLookupDialog();
    };

    if (typeof window !== 'undefined' && typeof idleWindow.requestIdleCallback === 'function') {
      idleHandle = idleWindow.requestIdleCallback(prefetchStartupAdjacencies, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(prefetchStartupAdjacencies, 400);
    }

    return () => {
      if (idleHandle !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleHandle);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <NeoBrutalistLayout pageTitle="WORKBENCH OVERVIEW">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-subtle">
                Staff workspace
              </p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.03em] text-app-text-heading sm:text-4xl">
                Workbench Overview
              </h1>
              <p className="mt-3 text-sm leading-6 text-app-text-muted sm:text-base">
                Scan today&apos;s shortcuts, primary actions, and enabled workstreams without loading
                analytics-heavy widgets on startup.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {primaryAction ? (
                <button
                  type="button"
                  onClick={() => navigate(primaryAction.path)}
                  className="inline-flex items-center justify-center rounded-xl border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                >
                  {primaryAction.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowCustomize((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                aria-expanded={showCustomize}
                aria-controls="dashboard-customizer"
              >
                {showCustomize ? 'Close view settings' : 'Customize view'}
              </button>
            </div>
          </div>
        </header>

        {showCustomize ? (
          <div id="dashboard-customizer" className="mt-6">
            <DashboardCustomizer
              settings={settings}
              onSettingsChange={setSettings}
              onReset={resetSettings}
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {settings.showWorkspaceSummary ? (
            <section className="rounded-2xl border border-app-border/70 bg-app-surface/85 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-app-text-heading">Today at a Glance</h2>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Your current navigation setup defines the fastest way through staff workflows.
                  </p>
                </div>
                <Link
                  to="/settings/navigation"
                  className="inline-flex items-center rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-medium text-app-text transition hover:bg-app-hover"
                >
                  Tune shortcuts
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SummaryMetric
                  label="Pinned"
                  value={String(pinnedWorkstreams.length)}
                  description="Shortcut slots currently in use."
                />
                <SummaryMetric
                  label="Enabled"
                  value={String(totalWorkstreams)}
                  description="Workstreams visible in your staff navigation."
                />
                <SummaryMetric
                  label="Sections"
                  value={String(activeSectionCount)}
                  description="Distinct workflow areas currently enabled."
                />
              </div>

              <div className="mt-5 rounded-2xl border border-app-border/70 bg-app-surface-muted/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                  Next best step
                </p>
                <p className="mt-2 text-base font-semibold text-app-text-heading">
                  {primaryAction?.label ?? 'Review your workspace'}
                </p>
                <p className="mt-1 text-sm text-app-text-muted">
                  Keep repeated actions in view, then pin the modules you revisit most often.
                </p>
              </div>
            </section>
          ) : null}

          {settings.showQuickLookup ? <QuickLookupWidget className="h-full" /> : null}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {settings.showQuickActions ? <QuickActionsWidget /> : null}

          {settings.showPinnedWorkstreams ? (
            <WorkstreamPanel
              title="Pinned Shortcuts"
              description="The routes you marked for quick access."
              items={pinnedWorkstreams}
              emptyState="No shortcuts pinned yet. Open Navigation Settings and pin the modules you use every day."
              manageLabel="Manage shortcuts"
              manageTo="/settings/navigation"
            />
          ) : null}
        </div>

        {settings.showModules ? (
          <div className="mt-6">
            <WorkstreamPanel
              title="Enabled Workstreams"
              description="Available staff modules pulled directly from your navigation preferences."
              items={enabledWorkstreams}
              emptyState="No additional workstreams are enabled right now. Use Navigation Settings to turn modules back on."
              manageLabel="Navigation settings"
              manageTo="/settings/navigation"
            />
          </div>
        ) : null}
      </div>
    </NeoBrutalistLayout>
  );
}
