import type { ReactElement } from 'react';
import type { PreloadedState, Store } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { type RootState, rootReducer } from '../store';

interface RenderOptions {
  store?: Store;
  preloadedState?: PreloadedState<RootState>;
  route?: string;
}

export const createTestStore = (preloadedState?: PreloadedState<RootState>) =>
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
