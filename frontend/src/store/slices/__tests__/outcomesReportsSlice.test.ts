import { describe, expect, it } from 'vitest';
import reducer, {
  clearOutcomesReport,
  clearOutcomesReportError,
  fetchOutcomesReport,
  setOutcomesReportFilters,
} from '../outcomesReportsSlice';

const sampleFilters = {
  from: '2026-01-01',
  to: '2026-01-31',
  bucket: 'week' as const,
};

const sampleReport = {
  totalsByOutcome: [
    {
      outcomeDefinitionId: 'outcome-1',
      key: 'maintained_employment',
      name: 'Maintained employment',
      countImpacts: 4,
      uniqueClientsImpacted: 3,
    },
  ],
  timeseries: [
    {
      bucketStart: '2026-01-01',
      outcomeDefinitionId: 'outcome-1',
      countImpacts: 2,
    },
  ],
};

describe('outcomesReportsSlice', () => {
  it('handles fetch pending and fulfilled', () => {
    let state = reducer(undefined, { type: fetchOutcomesReport.pending.type });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();

    state = reducer(state, {
      type: fetchOutcomesReport.fulfilled.type,
      payload: {
        report: sampleReport,
        filters: sampleFilters,
      },
    });

    expect(state.loading).toBe(false);
    expect(state.report?.totalsByOutcome[0].countImpacts).toBe(4);
    expect(state.filters?.from).toBe('2026-01-01');
  });

  it('stores rejected error', () => {
    const state = reducer(undefined, {
      type: fetchOutcomesReport.rejected.type,
      payload: 'Nope',
    });

    expect(state.loading).toBe(false);
    expect(state.error).toBe('Nope');
  });

  it('sets and clears filters/report', () => {
    const withFilters = reducer(undefined, setOutcomesReportFilters(sampleFilters));
    expect(withFilters.filters?.to).toBe('2026-01-31');

    const withReport = reducer(withFilters, {
      type: fetchOutcomesReport.fulfilled.type,
      payload: {
        report: sampleReport,
        filters: sampleFilters,
      },
    });

    const clearedReport = reducer(withReport, clearOutcomesReport());
    expect(clearedReport.report).toBeNull();
    expect(clearedReport.filters).toBeNull();

    const withError = reducer(withReport, {
      type: fetchOutcomesReport.rejected.type,
      payload: 'Error',
    });

    const clearedError = reducer(withError, clearOutcomesReportError());
    expect(clearedError.error).toBeNull();
  });
});
