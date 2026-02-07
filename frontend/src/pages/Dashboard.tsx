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
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 font-body">
      {/* Header */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6 shadow-sm">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-sky-200/40 blur-2xl" aria-hidden="true" />
        <div className="absolute -left-12 -bottom-24 h-56 w-56 rounded-full bg-emerald-200/30 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Overview
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-500">
              Monitor your nonprofit's engagement, fundraising, and program delivery at a glance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowCustomize((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              aria-expanded={showCustomize}
              aria-controls="dashboard-customizer"
            >
              <SettingsIcon />
              <span>{showCustomize ? 'Close' : 'Edit'} Metrics</span>
            </button>
            <Link
              to="/dashboard/custom"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <SettingsIcon />
              <span>Customize Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Customizer Panel */}
      {showCustomize && (
        <div id="dashboard-customizer">
          <DashboardCustomizer
            settings={settings}
            onSettingsChange={setSettings}
            onReset={resetSettings}
          />
        </div>
      )}

      {/* Quick Lookup */}
      {settings.showQuickLookup && (
        <section className="mt-6" aria-label="Quick lookup">
          <QuickLookupWidget />
        </section>
      )}

      {/* Quick Actions */}
      {settings.showQuickActions && (
        <section className="mt-6" aria-label="Quick actions">
          <QuickActionsWidget />
        </section>
      )}

      {/* Priority Cards */}
      <PriorityCards
        urgentCasesCount={urgentCases.length}
        casesDueThisWeekCount={casesDueThisWeek.length}
        highEngagementCount={summary?.engagement_distribution.high ?? 0}
      />

      {/* Modules Grid */}
      {settings.showModules && (
        <ModulesGrid
          summary={summary}
          activeCasesCount={activeCases.length}
        />
      )}

      {/* Key Metrics */}
      <KPISection
        summary={summary}
        activeCasesCount={activeCases.length}
        urgentCasesCount={urgentCases.length}
        casesDueThisWeekCount={casesDueThisWeek.length}
        loading={summaryLoading}
        error={error}
        kpiSettings={settings.kpis}
      />

      {/* Engagement Chart */}
      {summary && settings.showEngagementChart && (
        <section className="mt-6" aria-label="Engagement distribution">
          <EngagementChart distribution={summary.engagement_distribution} />
        </section>
      )}

      {/* Volunteer Widget */}
      {settings.showVolunteerWidget && (
        <section className="mt-6" aria-label="Volunteer information">
          <VolunteerWidget showDetailedView={true} />
        </section>
      )}
    </main>
  );
}
