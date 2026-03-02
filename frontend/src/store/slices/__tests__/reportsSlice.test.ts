import { describe, it, expect } from 'vitest';
import reportsReducer, { fetchAvailableFields } from '../reportsSlice';

describe('reportsSlice', () => {
  it('includes opportunities in available fields cache on initial state', () => {
    const state = reportsReducer(undefined, { type: 'unknown' });

    expect(state.availableFields.cases).toBeNull();
    expect(state.availableFields.opportunities).toBeNull();
  });

  it('stores available fields payload for opportunities entity', () => {
    const initial = reportsReducer(undefined, { type: 'unknown' });

    const next = reportsReducer(
      initial,
      fetchAvailableFields.fulfilled(
        {
          entity: 'opportunities',
          fields: [{ field: 'stage_name', label: 'Stage', type: 'string' }],
        },
        'req-1',
        'opportunities'
      )
    );

    expect(next.availableFields.opportunities).toEqual([
      { field: 'stage_name', label: 'Stage', type: 'string' },
    ]);
  });
});
