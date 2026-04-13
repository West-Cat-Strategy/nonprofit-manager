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
  });

  it('transforms legacy flat preloaded state to modular nested state', () => {
    const state = { 
      eventsList: { contacts: [] } 
    };

    const normalized = normalizeRootState(state);
    expect(normalized.events.list).toEqual(state.eventsList);
    expect(normalized.eventsList).toBeUndefined();
  });
});
