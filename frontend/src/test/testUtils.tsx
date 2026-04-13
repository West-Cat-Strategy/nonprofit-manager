import type { ReactElement } from 'react';
import type { Store } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { type RootState, rootReducer } from '../store';

type PreloadedState = Partial<RootState>;

export const normalizeRootState = (state?: any): any => {
  if (!state) return state;
  const normalized = { ...state };

  // Normalize contacts: legacy flat state -> nested modular state
  if (normalized.contacts && !normalized.contacts.list && (normalized.contacts.contacts || normalized.contacts.loading)) {
    const { contacts, loading, error, pagination, filters, availableTags, ...rest } = normalized.contacts;
    normalized.contacts = {
      core: { currentContact: null, loading: false, error: null, ...rest.core },
      list: { contacts: contacts || [], loading: !!loading, error: error || null, pagination: pagination || { total: 0, page: 1, limit: 20, total_pages: 0 }, filters: filters || { search: '', account_id: '', is_active: null, tags: [], role: '', sort_by: 'created_at', sort_order: 'desc' }, availableTags: availableTags || [] },
      notes: { contactNotes: [], notesLoading: false, ...(rest.notes || {}) },
      comms: { communications: [], commsLoading: false, ...(rest.comms || {}) },
      relationships: { relationships: [], relationshipsLoading: false, ...(rest.relationships || {}) },
      documents: { contactDocuments: [], documentsLoading: false, ...(rest.documents || {}) },
    };
  }

  // Normalize volunteers: legacy flat state -> nested modular state
  if (normalized.volunteers && !normalized.volunteers.list && (normalized.volunteers.volunteers || normalized.volunteers.loading)) {
    const { volunteers, loading, error, pagination, filters, currentVolunteer, ...rest } = normalized.volunteers;
    normalized.volunteers = {
      core: { currentVolunteer: currentVolunteer || null, loading: false, error: null },
      list: { volunteers: volunteers || [], loading: !!loading, error: error || null, pagination: pagination || { total: 0, page: 1, limit: 20, total_pages: 0 }, filters: filters || { search: '', status: '', availability: '', skills: [], background_check_status: '', sort_by: 'created_at', sort_order: 'desc' } },
      assignments: { assignments: [], loading: false, ...(rest.assignments || {}) }
    };
  }

  // Handle legacy eventsList key at root
  if (normalized.eventsList && !normalized.events) {
    normalized.events = {
      list: normalized.eventsList,
      detail: { currentEvent: null, loading: false, error: null },
      registration: { registrations: [], loading: false, error: null },
      reminders: { reminders: [], loading: false, error: null },
      mutation: { saving: false, error: null },
      automation: { automations: [], loading: false, error: null }
    };
    delete normalized.eventsList;
  }

  return normalized;
};

interface RenderOptions {
  store?: Store;
  preloadedState?: PreloadedState;
  route?: string;
}

export const createTestStore = (preloadedState?: PreloadedState) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: normalizeRootState(preloadedState),
  });

export const renderWithProviders = (ui: ReactElement, { store, preloadedState, route = '/' }: RenderOptions = {}) => {
  const resolvedStore = store ?? createTestStore(preloadedState);
  return render(
    <Provider store={resolvedStore}>
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider>
          <ToastProvider>{ui}</ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );
};
