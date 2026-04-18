import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import reducer, { createCase, deleteCase, type CasesCoreState } from './casesCore';
import { casesApiClient } from '../api/casesApiClient';
import type { CaseWithDetails, CreateCaseDTO } from '../../../types/case';

vi.mock('../api/casesApiClient', () => ({
  casesApiClient: {
    createCase: vi.fn(),
    deleteCase: vi.fn(),
  },
}));

const createCaseRecord = (overrides: Partial<CaseWithDetails> = {}): CaseWithDetails => ({
  id: 'case-1',
  case_number: 'CASE-001',
  contact_id: 'contact-1',
  case_type_id: 'type-1',
  status_id: 'status-1',
  priority: 'medium',
  title: 'Housing Support',
  intake_date: '2026-03-01',
  is_urgent: false,
  client_viewable: false,
  requires_followup: false,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

const createStore = (coreOverrides: Partial<CasesCoreState> = {}) => {
  const initialCoreState = reducer(undefined, { type: '@@INIT' });

  return configureStore({
    reducer: {
      cases: combineReducers({
        core: reducer,
      }),
    },
    preloadedState: {
      cases: {
        core: {
          ...initialCoreState,
          ...coreOverrides,
        },
      },
    },
  });
};

describe('casesCore contact cache refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates and invalidates cached contact cases after create', async () => {
    const createdCase = createCaseRecord();
    vi.mocked(casesApiClient.createCase).mockResolvedValue(createdCase);

    const store = createStore({
      contactCasesByContactId: {
        'contact-1': {
          cases: [],
          loading: false,
          error: 'stale error',
          fetchedAt: 123,
        },
      },
    });

    const result = await store.dispatch(
      createCase({
        contact_id: 'contact-1',
        title: 'Housing Support',
      } as CreateCaseDTO)
    ).unwrap();

    expect(result).toEqual(createdCase);
    expect(store.getState().cases.core.contactCasesByContactId['contact-1']).toEqual({
      cases: [createdCase],
      loading: false,
      error: null,
      fetchedAt: null,
    });
  });

  it('removes and invalidates cached contact cases after delete', async () => {
    const existingCase = createCaseRecord();
    vi.mocked(casesApiClient.deleteCase).mockResolvedValue(undefined);

    const store = createStore({
      contactCasesByContactId: {
        'contact-1': {
          cases: [existingCase],
          loading: false,
          error: 'stale error',
          fetchedAt: 456,
        },
      },
    });

    const result = await store.dispatch(deleteCase(existingCase.id)).unwrap();

    expect(result).toEqual({
      id: existingCase.id,
      contactId: 'contact-1',
    });
    expect(store.getState().cases.core.contactCasesByContactId['contact-1']).toEqual({
      cases: [],
      loading: false,
      error: null,
      fetchedAt: null,
    });
  });
});
