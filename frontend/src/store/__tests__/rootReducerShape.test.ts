import { describe, expect, it } from 'vitest';
import { rootReducer } from '../index';
import { normalizeRootState } from '../../test/testUtils';

describe('root store shape', () => {
  it('exposes only canonical slice keys', () => {
    const state = rootReducer(undefined, { type: '@@INIT' });
    const keys = Object.keys(state);

    expect(keys).toContain('contacts');
    expect(keys).toContain('volunteers');
    expect(keys).toContain('eventsList');
    expect(keys).not.toContain('contactsV2');
    expect(keys).not.toContain('volunteersV2');
    expect(keys).not.toContain('eventsListV2');
  });

  it('keeps test preloaded state normalization as a no-op', () => {
    const state = { contacts: { total: 1 } } as Parameters<typeof normalizeRootState>[0];

    expect(normalizeRootState(state)).toBe(state);
  });
});
