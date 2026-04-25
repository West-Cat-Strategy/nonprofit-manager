/**
 * Customizable Dashboard Page
 * Responsive layout editor for the staff custom dashboard
 */

import { Link } from 'react-router-dom';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout/legacy';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import ConfirmDialog from '../../../components/ConfirmDialog';
import type { DashboardWidget, WidgetType, WidgetTemplate } from '../../../types/dashboard';
import { CUSTOM_DASHBOARD_LANES, DashboardDataProvider } from '../context/DashboardDataContext';
import {
  CATEGORY_LABELS,
  serializeLayout,
  useCustomDashboardController,
} from '../hooks/useCustomDashboardController';
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

const LEGACY_WIDGET_TYPES = new Set<WidgetType>(['recent_contacts', 'upcoming_events']);

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
  const {
    currentDashboard,
    loading,
    saving,
    editMode,
    error,
    isAuthenticated,
    dialogState,
    handleConfirm,
    handleCancel,
    showAddWidget,
    setShowAddWidget,
    creatingDefault,
    isNarrowViewport,
    breakpoints,
    cols,
    responsiveLayouts,
    groupedTemplates,
    dispatch,
    handleLayoutChange,
    commitLayoutDraft,
    handleSaveLayout,
    handleCancelEdit,
    handleResetToDefault,
    handleAddWidget,
    handleRemoveWidget,
    fetchDefaultDashboard,
    setEditMode,
  } = useCustomDashboardController();

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
                  ? isNarrowViewport
                    ? 'Layout editing is active. On smaller screens widgets stack vertically so the editor stays readable while you manage your dashboard.'
                    : 'Layout editing is active. Drag cards by their handles and resize them to match how you work.'
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
            {isNarrowViewport ? (
              <div className="space-y-4">
                {currentDashboard.widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className="overflow-hidden rounded-2xl border border-app-border/70 bg-app-surface shadow-sm"
                  >
                    {renderWidget(widget)}
                  </div>
                ))}
              </div>
            ) : (
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
                onDragStop={(layout: Layout) => commitLayoutDraft(serializeLayout(layout))}
                onResizeStop={(layout: Layout) => commitLayoutDraft(serializeLayout(layout))}
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
            )}
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
