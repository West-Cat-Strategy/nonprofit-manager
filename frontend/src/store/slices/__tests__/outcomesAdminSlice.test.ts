import { describe, expect, it } from 'vitest';
import {
  clearOutcomesAdminError,
  createOutcomeDefinition,
  disableOutcomeDefinition,
  enableOutcomeDefinition,
  fetchOutcomeDefinitionsAdmin,
  outcomesAdminReducer,
  reorderOutcomeDefinitions,
  updateOutcomeDefinition,
} from '../../../features/outcomes/state';

const makeOutcome = (overrides: Partial<ReturnType<typeof baseOutcome>> = {}) => ({
  ...baseOutcome(),
  ...overrides,
});

const baseOutcome = () => ({
  id: 'outcome-1',
  key: 'maintained_employment',
  name: 'Maintained employment',
  description: null,
  category: 'employment',
  is_active: true,
  is_reportable: true,
  sort_order: 10,
  created_at: '2026-02-19T00:00:00.000Z',
  updated_at: '2026-02-19T00:00:00.000Z',
});

describe('outcomesAdminSlice', () => {
  it('handles fetch pending and fulfilled', () => {
    let state = outcomesAdminReducer(undefined, { type: fetchOutcomeDefinitionsAdmin.pending.type });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();

    state = outcomesAdminReducer(state, {
      type: fetchOutcomeDefinitionsAdmin.fulfilled.type,
      payload: {
        definitions: [makeOutcome()],
        includeInactive: true,
      },
    });

    expect(state.loading).toBe(false);
    expect(state.definitions).toHaveLength(1);
    expect(state.includeInactive).toBe(true);
  });

  it('upserts create and update responses', () => {
    const created = makeOutcome({ id: 'outcome-2', sort_order: 20, key: 'obtained_employment' });
    let state = outcomesAdminReducer(undefined, {
      type: createOutcomeDefinition.fulfilled.type,
      payload: created,
    });

    expect(state.definitions).toHaveLength(1);

    state = outcomesAdminReducer(state, {
      type: updateOutcomeDefinition.fulfilled.type,
      payload: { ...created, name: 'Obtained employment' },
    });

    expect(state.definitions[0].name).toBe('Obtained employment');
  });

  it('handles enable and disable actions', () => {
    const initial = {
      ...outcomesAdminReducer(undefined, { type: '@@INIT' }),
      definitions: [makeOutcome()],
    };

    const disabled = outcomesAdminReducer(initial, {
      type: disableOutcomeDefinition.fulfilled.type,
      payload: makeOutcome({ is_active: false }),
    });

    expect(disabled.definitions[0].is_active).toBe(false);

    const enabled = outcomesAdminReducer(disabled, {
      type: enableOutcomeDefinition.fulfilled.type,
      payload: makeOutcome({ is_active: true }),
    });

    expect(enabled.definitions[0].is_active).toBe(true);
  });

  it('replaces definitions on reorder fulfilled', () => {
    const first = makeOutcome({ id: 'one', sort_order: 10, key: 'one', name: 'One' });
    const second = makeOutcome({ id: 'two', sort_order: 20, key: 'two', name: 'Two' });

    const state = outcomesAdminReducer(undefined, {
      type: reorderOutcomeDefinitions.fulfilled.type,
      payload: [second, first],
    });

    expect(state.definitions.map((d) => d.id)).toEqual(['two', 'one']);
  });

  it('clears error', () => {
    const withError = outcomesAdminReducer(undefined, {
      type: fetchOutcomeDefinitionsAdmin.rejected.type,
      payload: 'Boom',
    });

    const cleared = outcomesAdminReducer(withError, clearOutcomesAdminError());
    expect(cleared.error).toBeNull();
  });
});
