import { describe, expect, it } from 'vitest';
import { rootReducer } from '../index';
import { normalizeRootState } from '../../test/testUtils';

describe('root store shape', () => {
  it('exposes only canonical slice keys', () => {
    const state = rootReducer(undefined, { type: '@@INIT' });
    const keys = Object.keys(state);

    expect(keys).toContain('contacts');
    expect(keys).toContain('volunteers');
    expect(keys).toContain('events');
    expect(keys).not.toContain('eventsList');
    expect(keys).not.toContain('contactsV2');
    expect(keys).not.toContain('volunteersV2');

    const caseKeys = Object.keys(state.cases);
    expect(caseKeys).toEqual(['core', 'list', 'management']);
    expect(caseKeys).not.toContain('notes');
  });

  it('keeps legacy test-state normalization as an explicit compatibility helper', () => {
    const state = {
      eventsList: { contacts: [] }
    };

    const normalized = normalizeRootState(state);
    expect(normalized?.events?.list).toEqual(state.eventsList);
    expect(normalized?.eventsList).toBeUndefined();
  });
});
