import { describe, expect, it } from 'vitest';
import reducer, {
  addWidget,
  clearError,
  createDashboard,
  deleteDashboard,
  fetchDashboard,
  fetchDashboards,
  fetchDefaultDashboard,
  removeWidget,
  resetToDefault,
  saveDashboardLayout,
  setEditMode,
  toggleWidget,
  updateDashboard,
  updateLayout,
  updateWidgetSettings,
} from './dashboardCore';
import type { DashboardConfig, DashboardWidget, WidgetLayout } from '../types/contracts';

type ReducerAction = Parameters<typeof reducer>[1];

const rejectedAction = (type: string, message?: string): ReducerAction =>
  ({
    type,
    error: message ? { message } : {},
  }) as ReducerAction;

const createDashboardRequest = (
  overrides: Partial<Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'>> = {}
): Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'> => ({
  user_id: 'user-1',
  name: 'New',
  is_default: false,
  widgets: [],
  layout: [],
  ...overrides,
});

const createWidget = (id: string, enabled = true): DashboardWidget => ({
  id,
  type: 'donation_summary',
  title: `Widget ${id}`,
  enabled,
  layout: { i: id, x: 0, y: 0, w: 3, h: 2 },
  settings: { color: 'blue' },
});

const createDashboardConfig = (overrides: Partial<DashboardConfig> = {}): DashboardConfig => {
  const widgets = overrides.widgets ?? [createWidget('widget-a'), createWidget('widget-b')];
  return {
    id: 'dash-1',
    user_id: 'user-1',
    name: 'Primary',
    is_default: true,
    widgets,
    layout: widgets.map((w) => w.layout),
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
};

describe('dashboardCore reducer', () => {
  it('handles local reducers across edit/layout/widget branches', () => {
    const dashboard = createDashboardConfig();
    let state = reducer(undefined, fetchDashboard.fulfilled(dashboard, 'req-1', 'dash-1'));

    state = reducer(state, setEditMode(true));
    expect(state.editMode).toBe(true);

    const newLayout: WidgetLayout[] = [
      { i: 'widget-a', x: 1, y: 1, w: 4, h: 3 },
      { i: 'widget-b', x: 5, y: 0, w: 3, h: 2 },
    ];
    state = reducer(state, updateLayout(newLayout));
    expect(state.currentDashboard?.layout).toEqual(newLayout);
    expect(state.currentDashboard?.widgets[0].layout).toMatchObject({ x: 1, y: 1, w: 4, h: 3 });

    const widgetC = createWidget('widget-c');
    state = reducer(state, addWidget(widgetC));
    expect(state.currentDashboard?.widgets).toHaveLength(3);

    state = reducer(state, toggleWidget('widget-c'));
    expect(state.currentDashboard?.widgets.find((w) => w.id === 'widget-c')?.enabled).toBe(false);

    state = reducer(state, updateWidgetSettings({ widgetId: 'widget-c', settings: { size: 'large' } }));
    expect(state.currentDashboard?.widgets.find((w) => w.id === 'widget-c')?.settings).toMatchObject({
      color: 'blue',
      size: 'large',
    });

    state = reducer(state, removeWidget('widget-c'));
    expect(state.currentDashboard?.widgets.find((w) => w.id === 'widget-c')).toBeUndefined();

    state = reducer(state, resetToDefault());
    expect(state.currentDashboard?.id).toBe('dash-1');
    expect(state.currentDashboard?.user_id).toBe('user-1');

    state = reducer({ ...state, error: 'boom' }, clearError());
    expect(state.error).toBeNull();
  });

  it('keeps state unchanged for local reducers when current dashboard is absent', () => {
    const initial = reducer(undefined, { type: '@@INIT' });

    const afterLayout = reducer(initial, updateLayout([{ i: 'missing', x: 0, y: 0, w: 1, h: 1 }]));
    const afterAdd = reducer(initial, addWidget(createWidget('widget-z')));
    const afterRemove = reducer(initial, removeWidget('widget-z'));

    expect(afterLayout).toEqual(initial);
    expect(afterAdd).toEqual(initial);
    expect(afterRemove).toEqual(initial);
  });

  it('covers no-op branches for missing widgets and null current dashboard paths', () => {
    const initial = reducer(undefined, { type: '@@INIT' });

    const toggleWithoutCurrent = reducer(initial, toggleWidget('missing'));
    const settingsWithoutCurrent = reducer(
      initial,
      updateWidgetSettings({ widgetId: 'missing', settings: { tone: 'warm' } })
    );
    const resetWithoutCurrent = reducer(initial, resetToDefault());

    expect(toggleWithoutCurrent).toEqual(initial);
    expect(settingsWithoutCurrent).toEqual(initial);
    expect(resetWithoutCurrent).toEqual(initial);

    const withDashboard = reducer(
      initial,
      fetchDashboard.fulfilled(createDashboardConfig(), 'req-noop-1', 'dash-1')
    );

    const toggleMissingWidget = reducer(withDashboard, toggleWidget('does-not-exist'));
    const updateMissingWidget = reducer(
      withDashboard,
      updateWidgetSettings({ widgetId: 'does-not-exist', settings: { tone: 'cool' } })
    );
    expect(toggleMissingWidget.currentDashboard?.widgets).toEqual(withDashboard.currentDashboard?.widgets);
    expect(updateMissingWidget.currentDashboard?.widgets).toEqual(withDashboard.currentDashboard?.widgets);

    const saveWithoutCurrent = reducer(
      initial,
      saveDashboardLayout.fulfilled(
        createDashboardConfig({ layout: [{ i: 'x', x: 0, y: 0, w: 2, h: 2 }] }),
        'req-noop-2',
        { id: 'dash-1', layout: [{ i: 'x', x: 0, y: 0, w: 2, h: 2 }] }
      )
    );
    expect(saveWithoutCurrent.currentDashboard).toBeNull();
  });

  it('handles fetchDashboards fulfilled default-selection branches', () => {
    const defaultDash = createDashboardConfig({ id: 'dash-default', is_default: true });
    const secondaryDash = createDashboardConfig({ id: 'dash-secondary', is_default: false });

    const withDefault = reducer(
      reducer(undefined, { type: '@@INIT' }),
      fetchDashboards.fulfilled([secondaryDash, defaultDash], 'req-2', undefined)
    );

    expect(withDefault.currentDashboard?.id).toBe('dash-default');

    const withoutDefault = reducer(
      reducer(undefined, { type: '@@INIT' }),
      fetchDashboards.fulfilled([secondaryDash], 'req-3', undefined)
    );

    expect(withoutDefault.currentDashboard?.id).toBe('dash-secondary');

    const keepCurrent = reducer(
      {
        ...withDefault,
        currentDashboard: defaultDash,
      },
      fetchDashboards.fulfilled([secondaryDash], 'req-4', undefined)
    );

    expect(keepCurrent.currentDashboard?.id).toBe('dash-default');
  });

  it('handles fetchDefaultDashboard fulfilled with dedupe and insert branches', () => {
    const dash = createDashboardConfig({ id: 'dash-default' });

    const inserted = reducer(
      reducer(undefined, { type: '@@INIT' }),
      fetchDefaultDashboard.fulfilled(dash, 'req-5', undefined)
    );
    expect(inserted.currentDashboard?.id).toBe('dash-default');
    expect(inserted.dashboards).toHaveLength(1);

    const deduped = reducer(
      inserted,
      fetchDefaultDashboard.fulfilled(dash, 'req-6', undefined)
    );
    expect(deduped.dashboards).toHaveLength(1);
  });

  it('handles create/update/delete/save async reducer branches', () => {
    const base = reducer(
      reducer(undefined, { type: '@@INIT' }),
      fetchDashboards.fulfilled([
        createDashboardConfig({ id: 'dash-1', is_default: false }),
        createDashboardConfig({ id: 'dash-2', is_default: true }),
      ],
      'req-7',
      undefined)
    );

    const createPayload = createDashboardRequest();
    const pendingCreate = reducer(base, createDashboard.pending('req-8', createPayload));
    expect(pendingCreate.saving).toBe(true);
    expect(pendingCreate.error).toBeNull();

    const createdDash = createDashboardConfig({ id: 'dash-3', name: 'Created', is_default: false });
    const created = reducer(
      pendingCreate,
      createDashboard.fulfilled(createdDash, 'req-8', createPayload)
    );
    expect(created.currentDashboard?.id).toBe('dash-3');
    expect(created.dashboards.find((d) => d.id === 'dash-3')).toBeTruthy();

    const updatedDash = { ...createdDash, name: 'Updated' };
    const updated = reducer(
      { ...created, currentDashboard: createdDash },
      updateDashboard.fulfilled(updatedDash, 'req-9', { id: 'dash-3', config: { name: 'Updated' } })
    );
    expect(updated.currentDashboard?.name).toBe('Updated');

    const updateMissing = reducer(
      updated,
      updateDashboard.fulfilled(
        createDashboardConfig({ id: 'dash-missing', name: 'Ghost' }),
        'req-10',
        { id: 'dash-missing', config: { name: 'Ghost' } }
      )
    );
    expect(updateMissing.dashboards.find((d) => d.id === 'dash-missing')).toBeFalsy();

    const afterDeleteCurrent = reducer(
      {
        ...updateMissing,
        currentDashboard: updateMissing.dashboards.find((d) => d.id === 'dash-1') || null,
      },
      deleteDashboard.fulfilled('dash-1', 'req-11', 'dash-1')
    );
    expect(afterDeleteCurrent.currentDashboard?.id).toBe('dash-2');

    const afterDeleteWithoutDefault = reducer(
      {
        ...afterDeleteCurrent,
        dashboards: [createDashboardConfig({ id: 'only', is_default: false })],
        currentDashboard: createDashboardConfig({ id: 'only', is_default: false }),
      },
      deleteDashboard.fulfilled('only', 'req-12', 'only')
    );
    expect(afterDeleteWithoutDefault.currentDashboard).toBeNull();

    const layoutUpdate = [{ i: 'widget-a', x: 2, y: 2, w: 4, h: 3 }];
    const afterSaveLayout = reducer(
      {
        ...afterDeleteCurrent,
        currentDashboard: createDashboardConfig({ id: 'dash-2' }),
      },
      saveDashboardLayout.fulfilled(
        createDashboardConfig({ id: 'dash-2', layout: layoutUpdate }),
        'req-13',
        { id: 'dash-2', layout: layoutUpdate }
      )
    );
    expect(afterSaveLayout.currentDashboard?.layout).toEqual(layoutUpdate);
  });

  it('handles rejected async actions with explicit and fallback errors', () => {
    const base = reducer(undefined, { type: '@@INIT' });

    const fetchRejected = reducer(
      reducer(base, fetchDashboards.pending('req-14', undefined)),
      rejectedAction(fetchDashboards.rejected.type, 'fetch boom')
    );
    expect(fetchRejected.loading).toBe(false);
    expect(fetchRejected.error).toBe('fetch boom');

    const defaultRejectedFallback = reducer(
      reducer(base, fetchDefaultDashboard.pending('req-15', undefined)),
      rejectedAction(fetchDefaultDashboard.rejected.type)
    );
    expect(defaultRejectedFallback.error).toBe('Failed to fetch default dashboard');

    const createRejectedFallback = reducer(
      reducer(base, createDashboard.pending('req-16', createDashboardRequest({ name: 'x' }))),
      rejectedAction(createDashboard.rejected.type)
    );
    expect(createRejectedFallback.error).toBe('Failed to create dashboard');
    expect(createRejectedFallback.saving).toBe(false);
  });
});
