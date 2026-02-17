import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAnalyticsSummary } from '../store/slices/analyticsSlice';
import { fetchCases, selectActiveCases, selectUrgentCases, selectCasesDueThisWeek } from '../store/slices/casesSlice';
import { useDashboardSettings } from '../hooks/useDashboardSettings';
import VolunteerWidget from '../components/VolunteerWidget';
import {
  QuickLookupWidget,
  QuickActionsWidget,
  KPISection,
  EngagementChart,
  ModulesGrid,
  PriorityCards,
  DashboardCustomizer,
} from '../components/dashboard';

const SettingsIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
    />
  </svg>
);

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { summary, summaryLoading, error } = useAppSelector((state) => state.analytics);
  const [showCustomize, setShowCustomize] = useState(false);
  const { settings, setSettings, resetSettings } = useDashboardSettings();

  const activeCases = useAppSelector(selectActiveCases);
  const urgentCases = useAppSelector(selectUrgentCases);
  const casesDueThisWeek = useAppSelector(selectCasesDueThisWeek);

  useEffect(() => {
    dispatch(fetchAnalyticsSummary());
    dispatch(fetchCases({}));
  }, [dispatch]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 font-body transition-colors duration-300">
      {/* Header */}
      <header className="relative overflow-hidden rounded-3xl border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[6px_6px_0px_0px_var(--shadow-color)] transition-all">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--loop-blue)] opacity-20 blur-2xl" aria-hidden="true" />
        <div className="absolute -left-12 -bottom-24 h-56 w-56 rounded-full bg-[var(--loop-yellow)] opacity-20 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)]">
              Overview
            </p>
            <h1 className="font-display mt-2 text-4xl font-black uppercase text-[var(--app-text)] tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm font-medium text-[var(--app-text-subtle)]">
              Monitor your nonprofit's engagement, fundraising, and program delivery at a glance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowCustomize((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[4px_4px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
              aria-expanded={showCustomize}
              aria-controls="dashboard-customizer"
            >
              <SettingsIcon />
              <span>{showCustomize ? 'Close' : 'Edit'} Metrics</span>
            </button>
            <Link
              to="/dashboard/custom"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase border-2 border-[var(--app-border)] bg-[var(--app-text)] text-[var(--app-bg)] shadow-[4px_4px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
            >
              <SettingsIcon />
              <span>Customize Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Customizer Panel */}
      {showCustomize && (
        <div id="dashboard-customizer" className="mt-6">
          <DashboardCustomizer
            settings={settings}
            onSettingsChange={setSettings}
            onReset={resetSettings}
          />
        </div>
      )}

      {/* Quick Lookup */}
      {settings.showQuickLookup && (
        <section className="mt-8" aria-label="Quick lookup">
          <QuickLookupWidget />
        </section>
      )}

      {/* Quick Actions */}
      {settings.showQuickActions && (
        <section className="mt-8" aria-label="Quick actions">
          <QuickActionsWidget />
        </section>
      )}

      {/* Priority Cards */}
      <div className="mt-8">
        <PriorityCards
          urgentCasesCount={urgentCases.length}
          casesDueThisWeekCount={casesDueThisWeek.length}
          highEngagementCount={summary?.engagement_distribution.high ?? 0}
        />
      </div>

      {/* Modules Grid */}
      {settings.showModules && (
        <div className="mt-8">
          <ModulesGrid
            summary={summary}
            activeCasesCount={activeCases.length}
          />
        </div>
      )}

      {/* Key Metrics */}
      <div className="mt-8">
        <KPISection
          summary={summary}
          activeCasesCount={activeCases.length}
          urgentCasesCount={urgentCases.length}
          casesDueThisWeekCount={casesDueThisWeek.length}
          loading={summaryLoading}
          error={error}
          kpiSettings={settings.kpis}
        />
      </div>

      {/* Engagement Chart */}
      {summary && settings.showEngagementChart && (
        <section className="mt-8" aria-label="Engagement distribution">
          <EngagementChart distribution={summary.engagement_distribution} />
        </section>
      )}

      {/* Volunteer Widget */}
      {settings.showVolunteerWidget && (
        <section className="mt-8" aria-label="Volunteer information">
          <VolunteerWidget showDetailedView={true} />
        </section>
      )}
    </main>
  );
}
