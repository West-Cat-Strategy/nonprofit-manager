import { describe, expect, it } from 'vitest';
import {
  clearOutcomesReport,
  clearOutcomesReportError,
  fetchOutcomesReport,
  outcomesReportsReducer,
  setOutcomesReportFilters,
} from '../../../features/outcomes/state';

const sampleFilters = {
  from: '2026-01-01',
  to: '2026-01-31',
  bucket: 'week' as const,
  source: 'all' as const,
};

const sampleReport = {
  totalsByOutcome: [
    {
      outcomeDefinitionId: 'outcome-1',
      key: 'maintained_employment',
      name: 'Maintained employment',
      countImpacts: 4,
      uniqueClientsImpacted: 3,
      sourceBreakdown: {
        interaction: {
          countImpacts: 2,
          uniqueClientsImpacted: 2,
        },
        event: {
          countImpacts: 2,
          uniqueClientsImpacted: 2,
        },
      },
    },
  ],
  timeseries: [
    {
      bucketStart: '2026-01-01',
      outcomeDefinitionId: 'outcome-1',
      source: 'interaction' as const,
      countImpacts: 2,
    },
  ],
};

describe('outcomesReportsSlice', () => {
  it('handles fetch pending and fulfilled', () => {
    let state = outcomesReportsReducer(undefined, { type: fetchOutcomesReport.pending.type });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();

    state = outcomesReportsReducer(state, {
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
    const state = outcomesReportsReducer(undefined, {
      type: fetchOutcomesReport.rejected.type,
      payload: 'Nope',
    });

    expect(state.loading).toBe(false);
    expect(state.error).toBe('Nope');
  });

  it('sets and clears filters/report', () => {
    const withFilters = outcomesReportsReducer(undefined, setOutcomesReportFilters(sampleFilters));
    expect(withFilters.filters?.to).toBe('2026-01-31');

    const withReport = outcomesReportsReducer(withFilters, {
      type: fetchOutcomesReport.fulfilled.type,
      payload: {
        report: sampleReport,
        filters: sampleFilters,
      },
    });

    const clearedReport = outcomesReportsReducer(withReport, clearOutcomesReport());
    expect(clearedReport.report).toBeNull();
    expect(clearedReport.filters).toBeNull();

    const withError = outcomesReportsReducer(withReport, {
      type: fetchOutcomesReport.rejected.type,
      payload: 'Error',
    });

    const clearedError = outcomesReportsReducer(withError, clearOutcomesReportError());
    expect(clearedError.error).toBeNull();
  });
});
