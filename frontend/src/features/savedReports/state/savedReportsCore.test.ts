import { describe, expect, it } from 'vitest';
import reducer, {
  clearCurrentSavedReport,
  clearError,
  createSavedReport,
  deleteSavedReport,
  fetchSavedReportById,
  fetchSavedReports,
  updateSavedReport,
} from './savedReportsCore';

const reportA = {
  id: 'report-a',
  name: 'Report A',
  description: 'A',
  entity: 'accounts',
  report_definition: { fields: ['name'] },
  is_public: false,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
} as any;

const reportB = {
  ...reportA,
  id: 'report-b',
  name: 'Report B',
} as any;

const pageWithA = {
  items: [reportA],
  pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
} as any;

describe('savedReportsCore reducer', () => {
  it('handles fetch lifecycles with explicit and fallback errors', () => {
    let state = reducer(undefined, fetchSavedReports.pending('r1', undefined));
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();

    state = reducer(state, fetchSavedReports.fulfilled(pageWithA, 'r1', undefined));
    expect(state.loading).toBe(false);
    expect(state.reports).toHaveLength(1);
    expect(state.pagination.total).toBe(1);

    state = reducer(
      state,
      fetchSavedReports.rejected(new Error('fetch all failed') as any, 'r2', undefined)
    );
    expect(state.error).toBe('fetch all failed');

    state = reducer(
      state,
      {
        type: fetchSavedReports.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch saved reports');

    state = reducer(state, fetchSavedReportById.pending('r3', 'report-a'));
    state = reducer(state, fetchSavedReportById.fulfilled(reportA, 'r3', 'report-a'));
    expect(state.currentSavedReport?.id).toBe('report-a');

    state = reducer(
      state,
      {
        type: fetchSavedReportById.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch saved report');
  });

  it('handles create/update/delete lifecycles and index/current branches', () => {
    let state = reducer(
      reducer(undefined, { type: '@@INIT' }),
      fetchSavedReports.fulfilled(pageWithA, 'base', undefined)
    );

    state = reducer(state, createSavedReport.pending('r4', reportB));
    state = reducer(state, createSavedReport.fulfilled(reportB, 'r4', reportB));
    expect(state.reports[0].id).toBe('report-b');
    expect(state.currentSavedReport?.id).toBe('report-b');

    const updatedA = { ...reportA, name: 'Report A Updated' };
    state = reducer(
      state,
      updateSavedReport.fulfilled(updatedA, 'r5', { id: 'report-a', data: { name: 'Report A Updated' } })
    );
    expect(state.reports.find((r) => r.id === 'report-a')?.name).toBe('Report A Updated');
    expect(state.currentSavedReport?.id).toBe('report-a');

    const updatedMissing = { ...reportA, id: 'missing-report', name: 'Missing' };
    state = reducer(
      state,
      updateSavedReport.fulfilled(updatedMissing, 'r6', { id: 'missing-report', data: { name: 'Missing' } })
    );
    expect(state.reports.find((r) => r.id === 'missing-report')).toBeUndefined();
    expect(state.currentSavedReport?.id).toBe('missing-report');

    state = reducer(state, deleteSavedReport.fulfilled('report-a', 'r7', 'report-a'));
    expect(state.reports.find((r) => r.id === 'report-a')).toBeUndefined();

    state = reducer(state, deleteSavedReport.fulfilled('missing-report', 'r8', 'missing-report'));
    expect(state.currentSavedReport).toBeNull();

    state = reducer(
      state,
      {
        type: createSavedReport.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to create saved report');

    state = reducer(
      state,
      {
        type: updateSavedReport.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to update saved report');

    state = reducer(
      state,
      {
        type: deleteSavedReport.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to delete saved report');
  });

  it('clears current report and error', () => {
    let state = reducer(undefined, fetchSavedReportById.fulfilled(reportA, 'r9', 'report-a'));
    state = reducer({ ...state, error: 'boom' }, clearError());
    expect(state.error).toBeNull();

    state = reducer(state, clearCurrentSavedReport());
    expect(state.currentSavedReport).toBeNull();
  });
});
