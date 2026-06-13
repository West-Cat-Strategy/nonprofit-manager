import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import type { OutcomeDefinition, OutcomesReportData } from '../../../types/outcomes';
import {
  createOutcomeDefinition,
  fetchOutcomeDefinitionsAdmin,
  outcomesAdminReducer,
  outcomesReportsReducer,
  fetchOutcomesReport,
  setOutcomesReportFilters,
} from './index';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const outcomeDefinition = (overrides: Partial<OutcomeDefinition>): OutcomeDefinition => ({
  id: overrides.id || 'outcome-1',
  key: overrides.key || 'housing_stable',
  name: overrides.name || 'Housing stable',
  description: overrides.description ?? null,
  category: overrides.category ?? null,
  is_active: overrides.is_active ?? true,
  is_reportable: overrides.is_reportable ?? true,
  sort_order: overrides.sort_order ?? 10,
  created_at: overrides.created_at || '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at || '2026-01-01T00:00:00.000Z',
});

const createStore = () =>
  configureStore({
    reducer: {
      outcomesAdmin: outcomesAdminReducer,
      outcomesReports: outcomesReportsReducer,
    },
  });

describe('outcomes state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads admin outcome definitions with the requested inactive filter', async () => {
    const definitions = [outcomeDefinition({ id: 'outcome-active' })];
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: definitions } });
    const store = createStore();

    await store.dispatch(fetchOutcomeDefinitionsAdmin(false));

    expect(mockApi.get).toHaveBeenCalledWith('/admin/outcomes?includeInactive=false');
    expect(store.getState().outcomesAdmin).toMatchObject({
      includeInactive: false,
      loading: false,
      definitions,
      error: null,
    });
  });

  it('sorts newly created outcome definitions into reducer state', () => {
    const existing = outcomeDefinition({
      id: 'outcome-existing',
      key: 'z_existing',
      name: 'Existing',
      sort_order: 20,
    });
    const inserted = outcomeDefinition({
      id: 'outcome-new',
      key: 'a_new',
      name: 'New',
      sort_order: 5,
    });
    let state = outcomesAdminReducer(undefined, createOutcomeDefinition.fulfilled(existing, 'req-1', {
      key: existing.key,
      name: existing.name,
    }));

    state = outcomesAdminReducer(state, createOutcomeDefinition.fulfilled(inserted, 'req-2', {
      key: inserted.key,
      name: inserted.name,
    }));

    expect(state.definitions.map((definition) => definition.id)).toEqual([
      'outcome-new',
      'outcome-existing',
    ]);
  });

  it('serializes outcomes report filters and stores the returned report', async () => {
    const report: OutcomesReportData = {
      totalsByOutcome: [],
      timeseries: [],
    };
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: report } });
    const store = createStore();

    await store.dispatch(
      fetchOutcomesReport({
        from: '2026-01-01',
        to: '2026-01-31',
        bucket: 'week',
        includeNonReportable: false,
        source: 'all',
        staffId: '',
      })
    );

    expect(mockApi.get).toHaveBeenCalledWith(
      '/reports/outcomes?from=2026-01-01&to=2026-01-31&bucket=week&includeNonReportable=false&source=all'
    );
    expect(store.getState().outcomesReports).toMatchObject({
      loading: false,
      report,
      filters: {
        from: '2026-01-01',
        to: '2026-01-31',
        bucket: 'week',
        includeNonReportable: false,
        source: 'all',
        staffId: '',
      },
      error: null,
    });
  });

  it('keeps local outcomes report filters before the report is fetched', () => {
    const state = outcomesReportsReducer(
      undefined,
      setOutcomesReportFilters({
        from: '2026-02-01',
        to: '2026-02-28',
        bucket: 'month',
      })
    );

    expect(state.filters).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
      bucket: 'month',
    });
  });
});
