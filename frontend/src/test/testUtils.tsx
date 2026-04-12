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

<<<<<<< HEAD
export const normalizeRootState = (state?: PreloadedState): PreloadedState | undefined => state;
=======
const ROOT_STATE_ALIASES: Array<readonly [keyof RootState, keyof RootState]> = [
  ['contactsV2', 'contacts'],
  ['volunteersV2', 'volunteers'],
  ['tasksV2', 'tasks'],
  ['analyticsV2', 'analytics'],
  ['casesV2', 'cases'],
  ['dashboardV2', 'dashboard'],
  ['followUpsV2', 'followUps'],
  ['eventsListV2', 'eventsList'],
  ['eventDetailV2', 'eventDetail'],
  ['eventRegistrationV2', 'eventRegistration'],
  ['eventRemindersV2', 'eventReminders'],
  ['eventMutationV2', 'eventMutation'],
  ['eventAutomationV2', 'eventAutomation'],
];

export const normalizeRootState = (state?: PreloadedState): PreloadedState | undefined => {
  if (!state) {
    return state;
  }

  const normalized = { ...state } as Record<string, unknown>;

  for (const [legacyKey, canonicalKey] of ROOT_STATE_ALIASES) {
    const hasLegacyKey = Object.prototype.hasOwnProperty.call(normalized, legacyKey);
    const hasCanonicalKey = Object.prototype.hasOwnProperty.call(normalized, canonicalKey);

    if (hasLegacyKey && !hasCanonicalKey) {
      normalized[canonicalKey] = normalized[legacyKey];
    } else if (hasCanonicalKey && !hasLegacyKey) {
      normalized[legacyKey] = normalized[canonicalKey];
    }
  }

  return normalized as PreloadedState;
};
>>>>>>> origin/main

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
