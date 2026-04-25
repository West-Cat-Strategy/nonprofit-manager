import { useEffect, useMemo, useRef, useState } from 'react';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type { DashboardWidget, WidgetLayout, WidgetTemplate, WidgetType } from '../../../types/dashboard';
import { DEFAULT_DASHBOARD_CONFIG, WIDGET_TEMPLATES } from '../../../types/dashboard';
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

export const DEFAULT_BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
export const DEFAULT_COLS = { lg: 12, md: 10, sm: 6, xs: 4 };
export const CATEGORY_LABELS: Record<WidgetTemplate['category'], string> = {
  analytics: 'Insight Widgets',
  activity: 'Recent Activity',
  management: 'Workload Widgets',
  'quick-access': 'Quick Launch',
};

export const serializeLayout = (layout: Layout): WidgetLayout[] =>
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

const areWidgetLayoutsEqual = (left: WidgetLayout[], right: WidgetLayout[]): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const applyLayoutToWidgets = (
  widgets: DashboardWidget[],
  layout: WidgetLayout[]
): DashboardWidget[] =>
  widgets.map((widget) => {
    const nextLayout = layout.find((item) => item.i === widget.id);
    return nextLayout ? { ...widget, layout: nextLayout } : widget;
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

export function useCustomDashboardController() {
  const dispatch = useAppDispatch();
  const { currentDashboard, loading, saving, editMode, error } = useAppSelector(
    (state) => state.dashboard
  );
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [creatingDefault, setCreatingDefault] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < DEFAULT_BREAKPOINTS.sm : false
  );
  const [layoutDraft, setLayoutDraft] = useState<WidgetLayout[] | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        const result = await dispatch(fetchDashboards()).unwrap();
        const hasDefaultDashboard =
          Array.isArray(result) && result.some((dashboard) => dashboard.is_default);

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

  const breakpoints = currentDashboard?.breakpoints ?? DEFAULT_BREAKPOINTS;
  const cols = currentDashboard?.cols ?? DEFAULT_COLS;

  useEffect(() => {
    if (!currentDashboard) {
      setLayoutDraft(null);
      return;
    }

    setLayoutDraft(currentDashboard.layout);
  }, [currentDashboard]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${Math.max(0, breakpoints.sm - 1)}px)`);
    const syncViewportMode = () => setIsNarrowViewport(mediaQuery.matches);
    syncViewportMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewportMode);
      return () => mediaQuery.removeEventListener('change', syncViewportMode);
    }

    mediaQuery.addListener(syncViewportMode);
    return () => mediaQuery.removeListener(syncViewportMode);
  }, [breakpoints.sm]);

  const responsiveLayouts = useMemo(
    () => buildResponsiveLayouts(layoutDraft ?? currentDashboard?.layout ?? [], cols),
    [cols, currentDashboard?.layout, layoutDraft]
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

  const commitLayoutDraft = (nextLayout: WidgetLayout[] | null) => {
    if (!currentDashboard || !nextLayout) {
      return;
    }

    if (areWidgetLayoutsEqual(currentDashboard.layout, nextLayout)) {
      return;
    }

    dispatch(updateLayout(nextLayout));
  };

  const handleLayoutChange = (layout: Layout, _layouts: ResponsiveLayouts) => {
    if (!editMode || !currentDashboard) {
      return;
    }

    setLayoutDraft(serializeLayout(layout));
  };

  const handleSaveLayout = async () => {
    if (!currentDashboard?.id) return;

    const nextLayout = layoutDraft ?? currentDashboard.layout;
    commitLayoutDraft(nextLayout);
    const nextDashboard = {
      widgets: applyLayoutToWidgets(currentDashboard.widgets, nextLayout),
      layout: nextLayout,
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
    setLayoutDraft(currentDashboard?.layout ?? null);
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
    setLayoutDraft(nextDashboard.layout);
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

  return {
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
  };
}
