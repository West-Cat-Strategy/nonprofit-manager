/**
 * Customizable Dashboard Page
 * Responsive layout editor for the staff custom dashboard
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Responsive, WidthProvider, type Layout, type ResponsiveLayouts } from 'react-grid-layout/legacy';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  addWidget,
  fetchDashboard,
  fetchDashboards,
  fetchDefaultDashboard,
  removeWidget,
  resetToDefault,
  setEditMode,
  updateDashboard,
  updateLayout,
} from '../state';
import type { DashboardWidget, WidgetLayout, WidgetType, WidgetTemplate } from '../../../types/dashboard';
import { DEFAULT_DASHBOARD_CONFIG, WIDGET_TEMPLATES } from '../../../types/dashboard';
import { CUSTOM_DASHBOARD_LANES, DashboardDataProvider } from '../context/DashboardDataContext';
import {
  ActivityFeedWidget,
  CaseSummaryWidget,
  DonationSummaryWidget,
  DonationTrendsWidget,
  EventAttendanceWidget,
  MyCasesWidget,
  PlausibleStatsWidget,
  QuickActionsWidget,
  RecentDonationsWidget,
  UpcomingFollowUpsWidget,
  VolunteerHoursWidget,
  WidgetContainer,
} from '../../../components/dashboard';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DEFAULT_BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
const DEFAULT_COLS = { lg: 12, md: 10, sm: 6, xs: 4 };
const CATEGORY_LABELS: Record<WidgetTemplate['category'], string> = {
  analytics: 'Insight Widgets',
  activity: 'Recent Activity',
  management: 'Workload Widgets',
  'quick-access': 'Quick Launch',
};

const LEGACY_WIDGET_TYPES = new Set<WidgetType>(['recent_contacts', 'upcoming_events']);

const serializeLayout = (layout: Layout): WidgetLayout[] =>
  layout.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
    maxW: item.maxW,
    maxH: item.maxH,
    static: item.static,
  }));

const clampLayoutForCols = (layout: WidgetLayout[], targetCols: number): WidgetLayout[] =>
  layout.map((item) => {
    const width = Math.min(item.w, targetCols);
    const maxX = Math.max(0, targetCols - width);
    return {
      ...item,
      w: width,
      x: Math.min(item.x, maxX),
    };
  });

const buildResponsiveLayouts = (
  layout: WidgetLayout[],
  cols: Record<string, number>
): ResponsiveLayouts => ({
  lg: clampLayoutForCols(layout, cols.lg),
  md: clampLayoutForCols(layout, cols.md),
  sm: clampLayoutForCols(layout, cols.sm),
  xs: clampLayoutForCols(layout, cols.xs),
});

function UnsupportedWidgetNotice({
  widget,
  editMode,
  onRemove,
}: {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}) {
  const isLegacyWidget = LEGACY_WIDGET_TYPES.has(widget.type);

  return (
    <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove}>
      <div className="space-y-3">
        <p className="text-sm font-semibold text-app-text-heading">
          {isLegacyWidget ? 'Saved legacy widget' : 'Unsupported widget'}
        </p>
        <p className="text-sm leading-6 text-app-text-muted">
          {isLegacyWidget
            ? 'This widget came from an older dashboard layout and is still preserved so your saved dashboard stays readable.'
            : 'This saved widget type is not available in the current dashboard editor.'}
        </p>
        <p className="text-sm leading-6 text-app-text-muted">
          Remove it individually or reset the dashboard if you want to return to the current default layout.
        </p>
      </div>
    </WidgetContainer>
  );
}

function CustomDashboardContent() {
  const dispatch = useAppDispatch();
  const { currentDashboard, loading, saving, editMode, error } = useAppSelector((state) => state.dashboard);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [creatingDefault, setCreatingDefault] = useState(false);
  const hasInitializedRef = useRef(false);
  const layoutCommitTimeoutRef = useRef<number | null>(null);
  const pendingLayoutRef = useRef<WidgetLayout[] | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        const result = await dispatch(fetchDashboards()).unwrap();
        const hasDefaultDashboard = Array.isArray(result) && result.some((dashboard) => dashboard.is_default);

        if (!hasDefaultDashboard) {
          setCreatingDefault(true);
          try {
            await dispatch(fetchDefaultDashboard()).unwrap();
          } finally {
            setCreatingDefault(false);
          }
        }
      } catch (initializationError) {
        console.error('[CustomDashboard] Failed to initialize dashboard:', initializationError);
        setCreatingDefault(false);
      }
    };

    if (isAuthenticated) {
      void initializeDashboard();
    }
  }, [dispatch, isAuthenticated]);

  useEffect(
    () => () => {
      if (layoutCommitTimeoutRef.current !== null) {
        window.clearTimeout(layoutCommitTimeoutRef.current);
      }
    },
    []
  );

  const breakpoints = currentDashboard?.breakpoints ?? DEFAULT_BREAKPOINTS;
  const cols = currentDashboard?.cols ?? DEFAULT_COLS;

  const responsiveLayouts = useMemo(
    () => buildResponsiveLayouts(currentDashboard?.layout ?? [], cols),
    [cols, currentDashboard?.layout]
  );

  const pickerTemplates = useMemo(
    () => WIDGET_TEMPLATES.filter((template) => template.pickerVisible !== false),
    []
  );

  const groupedTemplates = useMemo(() => {
    const nextGroups: Record<WidgetTemplate['category'], WidgetTemplate[]> = {
      analytics: [],
      activity: [],
      management: [],
      'quick-access': [],
    };

    pickerTemplates.forEach((template) => {
      nextGroups[template.category].push(template);
    });

    return nextGroups;
  }, [pickerTemplates]);

  const handleLayoutChange = (layout: Layout, _layouts: ResponsiveLayouts) => {
    if (!editMode || !currentDashboard) {
      return;
    }

    pendingLayoutRef.current = serializeLayout(layout);
    if (layoutCommitTimeoutRef.current !== null) {
      window.clearTimeout(layoutCommitTimeoutRef.current);
    }

    layoutCommitTimeoutRef.current = window.setTimeout(() => {
      if (pendingLayoutRef.current) {
        dispatch(updateLayout(pendingLayoutRef.current));
      }
      layoutCommitTimeoutRef.current = null;
    }, 120);
  };

  const commitPendingLayout = () => {
    if (pendingLayoutRef.current) {
      dispatch(updateLayout(pendingLayoutRef.current));
      pendingLayoutRef.current = null;
    }

    if (layoutCommitTimeoutRef.current !== null) {
      window.clearTimeout(layoutCommitTimeoutRef.current);
      layoutCommitTimeoutRef.current = null;
    }
  };

  const handleSaveLayout = async () => {
    if (!currentDashboard?.id) return;

    commitPendingLayout();
    const nextDashboard = {
      widgets: currentDashboard.widgets,
      layout: currentDashboard.layout,
      breakpoints: currentDashboard.breakpoints,
      cols: currentDashboard.cols,
    };

    await dispatch(
      updateDashboard({
        id: currentDashboard.id,
        config: nextDashboard,
      })
    );
    dispatch(setEditMode(false));
  };

  const handleCancelEdit = () => {
    dispatch(setEditMode(false));
    if (currentDashboard?.id) {
      void dispatch(fetchDashboard(currentDashboard.id));
    }
  };

  const handleResetToDefault = async () => {
    const confirmed = await confirm({
      title: 'Reset Dashboard',
      message: 'Reset dashboard to the current productivity-first layout? This cannot be undone.',
      confirmLabel: 'Reset Dashboard',
      variant: 'warning',
    });
    if (!confirmed || !currentDashboard?.id) return;

    dispatch(resetToDefault());
    const nextDashboard = {
      widgets: DEFAULT_DASHBOARD_CONFIG.widgets,
      layout: DEFAULT_DASHBOARD_CONFIG.layout,
      breakpoints: DEFAULT_DASHBOARD_CONFIG.breakpoints,
      cols: DEFAULT_DASHBOARD_CONFIG.cols,
    };
    await dispatch(
      updateDashboard({
        id: currentDashboard.id,
        config: nextDashboard,
      })
    );
    dispatch(setEditMode(false));
  };

  const handleAddWidget = (widgetType: WidgetType) => {
    const template = WIDGET_TEMPLATES.find((candidate) => candidate.type === widgetType);
    if (!template || !currentDashboard) return;

    const widgetId = `widget-${widgetType}-${Date.now()}`;
    const newWidget: DashboardWidget = {
      id: widgetId,
      type: widgetType,
      title: template.title,
      enabled: true,
      layout: { i: widgetId, ...template.defaultLayout },
    };

    dispatch(addWidget(newWidget));
    setShowAddWidget(false);
  };

  const handleRemoveWidget = (widgetId: string) => {
    void (async () => {
      const confirmed = await confirm({
        title: 'Remove Widget',
        message: 'Remove this widget from your dashboard layout?',
        confirmLabel: 'Remove Widget',
        variant: 'danger',
      });
      if (!confirmed) return;
      dispatch(removeWidget(widgetId));
    })();
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.enabled) return null;

    const commonProps = {
      widget,
      editMode,
      onRemove: () => handleRemoveWidget(widget.id),
    };

    switch (widget.type) {
      case 'donation_summary':
        return <DonationSummaryWidget {...commonProps} />;
      case 'recent_donations':
        return <RecentDonationsWidget {...commonProps} />;
      case 'donation_trends':
        return <DonationTrendsWidget {...commonProps} />;
      case 'volunteer_hours':
        return <VolunteerHoursWidget {...commonProps} />;
      case 'event_attendance':
        return <EventAttendanceWidget {...commonProps} />;
      case 'quick_actions':
        return <QuickActionsWidget {...commonProps} />;
      case 'case_summary':
        return <CaseSummaryWidget {...commonProps} />;
      case 'my_cases':
        return <MyCasesWidget {...commonProps} />;
      case 'activity_feed':
        return <ActivityFeedWidget {...commonProps} />;
      case 'plausible_stats':
        return <PlausibleStatsWidget {...commonProps} />;
      case 'upcoming_follow_ups':
        return <UpcomingFollowUpsWidget {...commonProps} />;
      case 'recent_contacts':
      case 'upcoming_events':
        return <UnsupportedWidgetNotice {...commonProps} />;
      default:
        return <UnsupportedWidgetNotice {...commonProps} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <NeoBrutalistLayout pageTitle="CUSTOM DASHBOARD">
        <div className="mx-auto flex h-64 max-w-4xl items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-2 text-app-text-muted">Please sign in to customize your dashboard.</div>
            <Link
              to="/login"
              className="text-sm font-medium text-app-accent hover:text-app-accent-text"
            >
              Go to login
            </Link>
          </div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (error && !loading && !creatingDefault) {
    return (
      <NeoBrutalistLayout pageTitle="CUSTOM DASHBOARD">
        <div className="mx-auto flex h-64 max-w-4xl items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-2 text-app-accent">Failed to load dashboard.</div>
            <div className="mb-4 text-sm text-app-text-muted">{error}</div>
            <button
              onClick={() => dispatch(fetchDefaultDashboard())}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
            >
              Retry
            </button>
          </div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (loading || creatingDefault || !currentDashboard) {
    return (
      <NeoBrutalistLayout pageTitle="CUSTOM DASHBOARD">
        <div className="mx-auto flex h-64 max-w-4xl items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-app-accent" />
            <div className="text-app-text-muted">
              {creatingDefault ? 'Creating your dashboard…' : 'Loading dashboard…'}
            </div>
          </div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="CUSTOM DASHBOARD">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-subtle">
                Custom dashboard
              </p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.03em] text-app-text-heading sm:text-4xl">
                {currentDashboard.name}
              </h1>
              <p className="mt-3 text-sm leading-6 text-app-text-muted sm:text-base">
                {editMode
                  ? 'Layout editing is active. Drag cards by their handles and resize them to match how you work.'
                  : 'Use this space for the deeper layout changes that complement the fast-launch workbench.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
              >
                Back to Workbench
              </Link>
              <Link
                to="/dashboard?panel=settings"
                className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
              >
                View Settings
              </Link>
              {editMode ? (
                <>
                  <button
                    onClick={() => setShowAddWidget(true)}
                    className="inline-flex items-center justify-center rounded-xl border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                  >
                    Add Widget
                  </button>
                  <button
                    onClick={handleResetToDefault}
                    className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLayout}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Layout'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => dispatch(setEditMode(true))}
                  className="inline-flex items-center justify-center rounded-xl border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                >
                  Edit Layout
                </button>
              )}
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-app-text-heading">Layout editing</h2>
              <p className="mt-1 text-sm text-app-text-muted">
                This editor controls card placement and saved widgets. Display preferences still live under workbench view settings.
              </p>
            </div>
            <div className="rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-medium text-app-text">
              {editMode ? 'Editing enabled' : 'Read-only preview'}
            </div>
          </div>

          <div className="mt-5">
            <ResponsiveGridLayout
              className="layout"
              layouts={responsiveLayouts}
              breakpoints={breakpoints}
              cols={cols}
              rowHeight={86}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              isDraggable={editMode}
              isResizable={editMode}
              draggableHandle=".drag-handle"
              onLayoutChange={handleLayoutChange}
            >
              {currentDashboard.widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="overflow-hidden rounded-2xl border border-app-border/70 bg-app-surface shadow-sm"
                >
                  {renderWidget(widget)}
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        </section>

        {showAddWidget ? (
          <div className="app-popup-backdrop fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="mx-4 max-h-[80vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-app-border bg-app-surface shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dashboard-widget-picker-title"
            >
              <div className="border-b border-app-border p-6">
                <h2 id="dashboard-widget-picker-title" className="text-xl font-semibold text-app-text-heading">
                  Add a widget
                </h2>
                <p className="mt-1 text-sm text-app-text-muted">
                  Choose from the currently supported dashboard widgets. Legacy saved widgets stay readable, but they are not listed here.
                </p>
              </div>

              <div className="space-y-6 p-6">
                {(Object.keys(groupedTemplates) as WidgetTemplate['category'][]).map((category) => {
                  const templates = groupedTemplates[category];
                  if (templates.length === 0) {
                    return null;
                  }

                  return (
                    <section key={category}>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        {CATEGORY_LABELS[category]}
                      </h3>
                      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {templates.map((template) => {
                          const alreadyAdded = currentDashboard.widgets.some((widget) => widget.type === template.type);
                          return (
                            <button
                              key={template.type}
                              onClick={() => handleAddWidget(template.type)}
                              disabled={alreadyAdded}
                              className={`rounded-2xl border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 ${
                                alreadyAdded
                                  ? 'cursor-not-allowed border-app-border bg-app-surface-muted opacity-50'
                                  : 'border-app-border bg-app-surface hover:border-app-accent hover:bg-app-hover'
                              }`}
                            >
                              <div className="mb-2 text-3xl">{template.icon}</div>
                              <h4 className="font-semibold text-app-text-heading">{template.title}</h4>
                              <p className="mt-1 text-sm text-app-text-muted">{template.description}</p>
                              {alreadyAdded ? (
                                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-app-text-subtle">
                                  Already in layout
                                </p>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="flex justify-end border-t border-app-border p-6">
                <button
                  onClick={() => setShowAddWidget(false)}
                  className="rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
      </div>
    </NeoBrutalistLayout>
  );
}

export default function CustomDashboardPage() {
  return (
    <DashboardDataProvider lanes={CUSTOM_DASHBOARD_LANES}>
      <CustomDashboardContent />
    </DashboardDataProvider>
  );
}
