import type { ReactElement } from 'react';
import type { Store } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { type RootState, rootReducer } from '../store';

type PreloadedState = Partial<RootState>;

interface RenderOptions {
  store?: Store;
  preloadedState?: PreloadedState;
  route?: string;
}

export const createTestStore = (preloadedState?: PreloadedState) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

export const renderWithProviders = (ui: ReactElement, { store, preloadedState, route = '/' }: RenderOptions = {}) => {
  const resolvedStore = store ?? createTestStore(preloadedState);
  return render(
    <Provider store={resolvedStore}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>{ui}</ToastProvider>
      </MemoryRouter>
    </Provider>
  );
};
