/**
 * Customizable Dashboard Page
 * Drag-and-drop dashboard with widgets
 */

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchDashboards,
  createDashboard,
  setEditMode,
  updateLayout,
  saveDashboardLayout,
  addWidget,
  removeWidget,
  resetToDefault,
} from '../store/slices/dashboardSlice';
import GridLayout, { type Layout } from 'react-grid-layout';
import type { DashboardWidget, WidgetType } from '../types/dashboard';
import { WIDGET_TEMPLATES, DEFAULT_DASHBOARD_CONFIG } from '../types/dashboard';

// Widget components (will be created separately)
import DonationSummaryWidget from '../components/dashboard/DonationSummaryWidget';
import RecentDonationsWidget from '../components/dashboard/RecentDonationsWidget';
import DonationTrendsWidget from '../components/dashboard/DonationTrendsWidget';
import VolunteerHoursWidget from '../components/dashboard/VolunteerHoursWidget';
import EventAttendanceWidget from '../components/dashboard/EventAttendanceWidget';
import QuickActionsWidget from '../components/dashboard/QuickActionsWidget';
import CaseSummaryWidget from '../components/dashboard/CaseSummaryWidget';
import MyCasesWidget from '../components/dashboard/MyCasesWidget';
import ActivityFeedWidget from '../components/dashboard/ActivityFeedWidget';
import PlausibleStatsWidget from '../components/dashboard/PlausibleStatsWidget';

const CustomDashboard = () => {
  const dispatch = useAppDispatch();
  const { currentDashboard, loading, saving, editMode } = useAppSelector((state) => state.dashboard);
  const { user } = useAppSelector((state) => state.auth);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [creatingDefault, setCreatingDefault] = useState(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        console.log('[CustomDashboard] Fetching dashboards for user:', user?.id);
        const result = await dispatch(fetchDashboards()).unwrap();
        console.log('[CustomDashboard] Fetched dashboards:', result);

        // If no dashboards exist, create a default one
        if (Array.isArray(result) && result.length === 0 && user) {
          console.log('[CustomDashboard] No dashboards found, creating default...');
          setCreatingDefault(true);
          const newDashboard = await dispatch(createDashboard({
            user_id: user.id,
            name: 'My Dashboard',
            is_default: true,
            widgets: DEFAULT_DASHBOARD_CONFIG.widgets,
            layout: DEFAULT_DASHBOARD_CONFIG.layout,
            breakpoints: DEFAULT_DASHBOARD_CONFIG.breakpoints,
            cols: DEFAULT_DASHBOARD_CONFIG.cols,
          })).unwrap();
          console.log('[CustomDashboard] Created dashboard:', newDashboard);
          // Refetch to get the newly created dashboard
          await dispatch(fetchDashboards()).unwrap();
          setCreatingDefault(false);
        }
      } catch (error) {
        console.error('[CustomDashboard] Failed to initialize dashboard:', error);
        setCreatingDefault(false);
      }
    };

    if (user) {
      console.log('[CustomDashboard] User available, initializing...');
      initializeDashboard();
    } else {
      console.log('[CustomDashboard] Waiting for user...');
    }
  }, [dispatch, user]);

  const handleLayoutChange = (layout: Layout[]) => {
    if (editMode && currentDashboard) {
      // Convert react-grid-layout Layout to WidgetLayout
      const widgetLayout = layout.map((item: any) => ({
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
      dispatch(updateLayout(widgetLayout));
    }
  };

  const handleSaveLayout = async () => {
    if (currentDashboard?.id) {
      await dispatch(
        saveDashboardLayout({
          id: currentDashboard.id,
          layout: currentDashboard.layout,
        })
      );
      dispatch(setEditMode(false));
    }
  };

  const handleCancelEdit = () => {
    dispatch(setEditMode(false));
    // Reload to restore original layout
    dispatch(fetchDashboards());
  };

  const handleResetToDefault = async () => {
    if (confirm('Reset dashboard to default layout? This cannot be undone.')) {
      dispatch(resetToDefault());
      if (currentDashboard?.id) {
        await dispatch(
          saveDashboardLayout({
            id: currentDashboard.id,
            layout: currentDashboard.layout,
          })
        );
      }
    }
  };

  const handleAddWidget = (widgetType: WidgetType) => {
    const template = WIDGET_TEMPLATES.find((t) => t.type === widgetType);
    if (!template || !currentDashboard) return;

    const newWidget: DashboardWidget = {
      id: `widget-${widgetType}-${Date.now()}`,
      type: widgetType,
      title: template.title,
      enabled: true,
      layout: { i: `widget-${widgetType}-${Date.now()}`, ...template.defaultLayout },
    };

    dispatch(addWidget(newWidget));
    setShowAddWidget(false);
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (confirm('Remove this widget from your dashboard?')) {
      dispatch(removeWidget(widgetId));
    }
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
      default:
        return <div className="p-4">Unknown widget type</div>;
    }
  };

  if (loading || creatingDefault || !currentDashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-500">
            {creatingDefault ? 'Creating your dashboard...' : 'Loading dashboard...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{currentDashboard.name}</h1>
          <p className="text-sm text-gray-500">
            {editMode ? 'Drag widgets to rearrange, resize by dragging corners' : 'Your personalized dashboard'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {editMode ? (
            <>
              <button
                onClick={() => setShowAddWidget(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Add Widget
              </button>
              <button
                onClick={handleResetToDefault}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset to Default
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLayout}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Layout'}
              </button>
            </>
          ) : (
            <button
              onClick={() => dispatch(setEditMode(true))}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Customize Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <GridLayout
        className="layout"
        layout={currentDashboard.layout}
        cols={12}
        rowHeight={80}
        width={1200}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={(layout) => handleLayoutChange(layout as unknown as Layout[])}
        draggableHandle=".drag-handle"
        {...({} as any)}
      >
        {currentDashboard.widgets.map((widget) => (
          <div
            key={widget.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            {renderWidget(widget)}
          </div>
        ))}
      </GridLayout>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Widget</h2>
              <p className="text-sm text-gray-500 mt-1">Choose a widget to add to your dashboard</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {WIDGET_TEMPLATES.map((template) => {
                  const alreadyAdded = currentDashboard.widgets.some((w) => w.type === template.type);
                  return (
                    <button
                      key={template.type}
                      onClick={() => handleAddWidget(template.type)}
                      disabled={alreadyAdded}
                      className={`p-4 text-left border-2 rounded-lg transition-all ${
                        alreadyAdded
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{template.icon}</div>
                      <h3 className="font-medium text-gray-900">{template.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      {alreadyAdded && (
                        <p className="text-xs text-blue-600 mt-2">Already added</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAddWidget(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDashboard;
